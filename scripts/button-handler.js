import { axios } from "@pipedream/platform" // Import HTTP client for API calls
import googleSheets from "@pipedream/google_sheets" // Import Google Sheets integration

export default defineComponent({ // Define Pipedream workflow component
  name: "Filter & Process Button Clicks", // Component name shown in workflow builder
  props: { // Input parameters for the component
    googleSheets, // Google Sheets service instance for authentication
    spreadsheetId: { // ID of Google Sheet (from URL)
      type: "string", // String data type
      label: "Spreadsheet ID", // User-friendly label in UI
    },
    telegramBotToken: { // Token for Telegram Bot API authentication
      type: "string", // String data type
      label: "Telegram Bot Token", // User-friendly label in UI
    },
  },
  
  async run({ $, steps }) { // Main execution function with context objects
    // ============================================ //
    // SECTION 1: IMMEDIATE WEBHOOK RESPONSE -->
    // ============================================ //
    $.respond({ // Immediately send HTTP response back to Telegram
      status: 200, // Success status code to stop retries
      headers: { // Response headers for proper formatting
        'Content-Type': 'application/json' // JSON content type
      },
      body: { // Response body content
        ok: true, // Standard Telegram API success flag
        method: "answerCallbackQuery", // Indicates action being performed
        result: "Processing your button click..." // Processing message
      }
    });
    
    console.log('✅ IMMEDIATE: Webhook responded - Telegram stops retrying'); // Log immediate response
    
    // ============================================ //
    // SECTION 2: TELEGRAM ACKNOWLEDGMENT FUNCTION -->
    // ============================================ //
    const answerCallbackQuery = async (callbackQueryId, text = "") => { // Function to answer callback queries
      await axios($, { // Make HTTP request to Telegram API
        method: "POST", // HTTP POST method for sending data
        url: `https://api.telegram.org/bot${this.telegramBotToken}/answerCallbackQuery`, // Telegram API endpoint
        data: { // Request payload data
          callback_query_id: callbackQueryId, // Unique ID for this button click
          text: text, // Optional text to show user
          show_alert: false // Don't show alert, just small notification
        }
      });
    };
    
    // ============================================ //
    // SECTION 3: TELEGRAM MESSAGING FUNCTION -->
    // ============================================ //
    const sendTelegramMessage = async (chatId, text) => { // Function to send messages to Telegram
      await axios($, { // Make HTTP request to Telegram API
        method: "POST", // HTTP POST method for sending data
        url: `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, // Telegram API endpoint
        data: { chat_id: chatId, text: text } // Destination chat and message text
      });
    };
    
    // ============================================ //
    // SECTION 4: MAIN PROCESSING LOGIC -->
    // ============================================ //
    try { // Begin error handling block for main processing
      console.log('=== PROCESSING BUTTON CLICK (after webhook response) ==='); // Start log for button processing
      
      const triggerData = steps.trigger.event.body; // Get raw webhook data from trigger
      const hasButtonData = triggerData?.callback_query?.data; // Extract which button was clicked
      const chatId = triggerData?.callback_query?.from?.id; // Extract user's Telegram ID
      const callbackQueryId = triggerData?.callback_query?.id; // Extract unique callback ID
      
      // ============================================ //
      // SECTION 5: ANSWER CALLBACK QUERY -->
      // ============================================ //
      if (callbackQueryId) { // Check if we have a callback query ID
        try { // Try to answer callback query for user feedback
          await answerCallbackQuery(callbackQueryId, "Processing..."); // Send processing notification
          console.log('✅ Callback query answered (user feedback)'); // Log successful acknowledgment
        } catch (ackError) { // Catch any errors during acknowledgment
          console.warn('⚠️ Callback answer failed:', ackError.message); // Log warning but continue
        }
      }
      
      // ============================================ //
      // SECTION 6: DATA VALIDATION -->
      // ============================================ //
      if (!hasButtonData || !chatId) { // Check if we have valid button click data
        console.log('🚫 Empty webhook - ending'); // Log empty webhook detection
        return { // Return early for empty webhooks
          processed: false, // No actual processing happened
          success: true, // Not an error, just empty data
          message: 'Health check ignored' // Description of what happened
        };
      }
      
      console.log('✅ Valid button click - processing'); // Log valid button click detection
      console.log('Button data:', hasButtonData); // Log which button data was received
      console.log('Chat ID:', chatId); // Log user's chat ID
      console.log('Callback ID:', callbackQueryId); // Log unique callback ID
      
      // ============================================ //
      // SECTION 7: "NONE" BUTTON HANDLING -->
      // ============================================ //
      if (hasButtonData === 'contact_none') { // Check if "None Recently" button was clicked
        await sendTelegramMessage(chatId, "👍 No problem! I'll check in again next week."); // Send acknowledgment message
        return { // Return early for "none" case
          processed: true, // Button was processed
          action: 'none', // Specific action type
          success: true // Successful completion
        };
      }
      
      // ============================================ //
      // SECTION 8: EXTRACT CONTACT NAME -->
      // ============================================ //
      const contactName = hasButtonData.replace('contact_', '').replace(/_/g, ' '); // Convert button data to contact name
      console.log('Contact to update:', contactName); // Log which contact is being updated
      
      // ============================================ //
      // SECTION 9: FIND CONTACT IN GOOGLE SHEETS -->
      // ============================================ //
      const sheetResponse = await this.googleSheets.getSpreadsheetValues(this.spreadsheetId, "A2:E100"); // Get all contacts from sheet
      
      let rowToUpdate = null; // Variable to store found row number
      for (let i = 0; i < sheetResponse.values.length; i++) { // Loop through all rows
        const rowName = sheetResponse.values[i][0]?.toString().trim(); // Get name from column A
        if (rowName === contactName) { // Check if name matches clicked contact
          rowToUpdate = i + 2; // Calculate actual row number (array index + 2)
          break; // Stop searching once found
        }
      }
      
      if (!rowToUpdate) { // Check if contact was not found
        await sendTelegramMessage(chatId, `❌ Contact "${contactName}" not found in spreadsheet.`); // Send error message to user
        throw new Error(`Contact "${contactName}" not found`); // Throw error for not found contact
      }
      
      console.log(`✅ Found contact at row ${rowToUpdate}`); // Log successful contact location
      
      // ============================================ //
      // SECTION 10: UPDATE GOOGLE SHEETS -->
      // ============================================ //
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // Get today's date in NY timezone
      console.log(`Updating ${contactName} to date: ${today}`); // Log update details
      
      const updateResult = await axios($, { // Make HTTP request to update Google Sheets
        method: "PUT", // HTTP PUT method for updating resources
        url: `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Sheet1!C${rowToUpdate}`, // Google Sheets API endpoint
        headers: { // Request headers
          "Authorization": `Bearer ${this.googleSheets.$auth.oauth_access_token}`, // OAuth token for authentication
          "Content-Type": "application/json" // JSON content type
        },
        params: { valueInputOption: "USER_ENTERED" }, // Format dates like user would enter
        data: { // Request payload data
          range: `Sheet1!C${rowToUpdate}`, // Exact cell to update
          majorDimension: "ROWS", // Data organized in rows
          values: [[today]] // 2D array with today's date
        }
      });
      
      console.log('✅ Google Sheets update successful'); // Log successful update
      
      // ============================================ //
      // SECTION 11: SEND USER CONFIRMATION -->
      // ============================================ //
      await sendTelegramMessage(chatId, `✅ Updated ${contactName}'s last contact to today!`); // Send success message to user
      
      console.log('✅ All processing completed successfully'); // Log final success
      
      // ============================================ //
      // SECTION 12: RETURN SUCCESS DATA -->
      // ============================================ //
      return { // Return data to Pipedream workflow
        processed: true, // Button was successfully processed
        success: true, // Overall success status
        contactName: contactName, // Name of updated contact
        rowUpdated: rowToUpdate, // Row number that was updated
        dateSet: today, // Date that was set
        callbackId: callbackQueryId // Telegram callback ID for reference
      };
      
    } catch (error) { // Catch any errors during main processing
      console.error('❌ Processing error:', error); // Log error details
      
      try { // Try to send error message to user
        const chatId = steps.trigger.event.body?.callback_query?.from?.id; // Get chat ID from trigger data
        if (chatId) { // Check if we have a chat ID
          await sendTelegramMessage(chatId, `❌ Error: ${error.message}`); // Send error message to user
        }
      } catch (telegramError) { // Catch errors during error message sending
        console.error('Failed to send error message:', telegramError); // Log error sending error
      }
      
      return { // Return error information
        processed: false, // No successful processing
        success: false, // Overall failure status
        error: error.message // Error details
      };
    }
  }
});
