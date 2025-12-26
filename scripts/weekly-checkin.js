import { axios } from "@pipedream/platform" // HTTP client for API calls 
import googleSheets from "@pipedream/google_sheets" // Google sheets integration

export default defineComponent({ // Defines a Pipedream workflow 
  name: "Process & Send Weekly Check-in", // Display name 
  props: { // Input parameters for the component
    googleSheets, // Google Sheets service instance
    spreadsheetId: { // ID of the Google sheet 
      type: "string",
      label: "Spreadsheet ID",
    },
    telegramBotToken: { // Token for Telgram Bot API
      type: "string", 
      label: "Telegram Bot Token",
    },
    chatId: { // Telegram chat/group ID to send to 
      type: "string",
      label: "Your Telegram Chat ID", 
    },
  },
  async run({ $ }) { // Main function that runs when component executes
    try { // Begin error handling block 
      console.log('=== PROCESSING WEEKLY CHECK-IN ==='); // Start log
      
      // 1. GET ALL CONTACTS FROM GOOGLE SHEETS -->
      const sheetResponse = await this.googleSheets.getSpreadsheetValues(this.spreadsheetId, "A2:E100"); // Get data from columns A-E, rows 2-100
      const rows = sheetResponse.values || []; // Extract values or use empty array
      
      console.log(`Found ${rows.length} contacts`); // Log contact count
      
      const today = new Date();  // Get current date
      const contactsDue = []; // Empty array to store due contacts

      // 2. PROCESS EACH CONTACT
      for (let i = 0; i < rows.length; i++) { // Loop through each row
        const row = rows[i]; // Get current row
        if (!row || row.length < 4) continue; // Skip if row empty or missing columns

        const name = row[0]?.toString().trim(); // Column A: Contact name
        const type = row[1]?.toString().trim(); // Column B: Contact type
        const lastContactStr = row[2]?.toString().trim(); // Column C: Last contact date as string
        const frequencyStr = row[3]?.toString().trim(); // Column D: Frequency (days) as string

        if (!name || !lastContactStr || !frequencyStr) continue; // Skip if essential data missing

        // Parse dates and check if due
        const lastContactDate = new Date(lastContactStr); // Convert string to Date object
        const targetFrequency = parseInt(frequencyStr); // Convert frequency string to number
        
        if (isNaN(lastContactDate.getTime()) || isNaN(targetFrequency)) continue; // Skip if invalid date or number

        // Calculate days since last contact
        const daysSinceContact = Math.floor((today - lastContactDate) / (1000 * 60 * 60 * 24));
        const bufferDays = 3;  // 3-day reminder buffer

        if (daysSinceContact >= (targetFrequency - bufferDays)) { // Check if due (with buffer)
          contactsDue.push({ // Add contact to due list
            name,
            type: type || "Contact", // Use "Contact" if type empty
            daysSinceContact,
            targetFrequency,
            overdueDays: Math.max(0, daysSinceContact - targetFrequency) // Calculate overdue days (minimum 0)
          });
        }
      }

      // 3. PREPARE TELEGRAM MESSAGE
      let message = "🤝 **Weekly Connection Check-in**\n\n"; // Message header
      const inlineKeyboard = []; // Array for interactive buttons

      if (contactsDue.length === 0) {
        message += "🎉 All contacts are up to date!"; // All caught up message
      } else {
        message += "Have you spoken to any of these people recently?\n\n";
        
        contactsDue.forEach(contact => { // Loop through due contacts
          const status = contact.overdueDays > 0 // Determine status message
            ? `(${contact.overdueDays} days overdue)`
            : `(due in ${contact.targetFrequency - contact.daysSinceContact} days)`;
          
          message += `• ${contact.name} - ${contact.type} ${status}\n`; // Add contact to message
          
          inlineKeyboard.push([{ // Add button for this contact
            text: `✅ ${contact.name}`,
            callback_data: `contact_${contact.name.replace(/\s+/g, '_')}` // Button callback data (spaces replaced with _)
          }]);
        });

        inlineKeyboard.push([{ // Add "None Recently" button
          text: "❌ None Recently", 
          callback_data: "contact_none"
        }]);
      }

      // 4. SEND TELEGRAM MESSAGE
      const telegramPayload = { // Data to send to Telegram API
        chat_id: this.chatId, // Destination chat
        text: message, // Message text
        parse_mode: "Markdown", // Enable Markdown formatting
        reply_markup: { // Add interactive keyboard
          inline_keyboard: inlineKeyboard
        }
      };

      const telegramResponse = await axios($, { // Send HTTP request to Telegram
        method: "POST",
        url: `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, // Telegram API endpoint
        data: telegramPayload // Send the payload
      });

      console.log(`✅ Sent check-in with ${contactsDue.length} contacts`); // Success log
      
      return { // Return data to Pipedream
        success: true,
        contactsProcessed: rows.length,
        contactsDue: contactsDue.length,
        messageSent: true
      };

    } catch (error) { // Catch any errors
      console.error('❌ Check-in error:', error); // Log error
      throw error; // Re-throw for Pipedream to handle
    }
  },
});
