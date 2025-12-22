export interface Transaction {
  amount: number
  date: string
  time: string
  mobileNumber?: string
}

export class GoogleSheetsService {
  private scriptUrl: string
  private isConnected: boolean = false

  constructor(scriptUrl: string) {
    this.scriptUrl = scriptUrl
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing connection to:', this.scriptUrl)
      const response = await fetch(this.scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "test"
        }),
      });

      this.isConnected = response.ok
      console.log('Google Sheets connection test:', this.isConnected ? 'SUCCESS' : 'FAILED')
      console.log('Response status:', response.status)

      if (response.ok) {
        const result = await response.text()
        console.log('Response from Google Sheets:', result)
      }

      return this.isConnected
    } catch (error) {
      console.error('Google Sheets connection test failed:', error)
      this.isConnected = false
      return false
    }
  }

  // Simple URL validation
  isUrlValid(): boolean {
    try {
      new URL(this.scriptUrl)
      return this.scriptUrl.includes('script.google.com/macros/s/')
    } catch {
      return false
    }
  }

  async saveAmountToPay(amountToPay: number): Promise<void> {
    try {
      // Create DateTime in the format matching the Google Sheet: DD-MM-YYYY HH:MM:SS
      const now = new Date()
      const dateTime = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-') + ' ' + now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })

      const response = await fetch(this.scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: 'cors', // Explicitly set CORS mode
        body: JSON.stringify({
          dateTime: dateTime,
          amountToPay: amountToPay.toFixed(3),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      this.isConnected = true
      console.log('Data saved to Google Sheets:', { dateTime, amountToPay })
    } catch (error) {
      console.error('Error saving to Google Sheets:', error)
      console.log('Falling back to localStorage only')
      this.isConnected = false
      // Don't throw error - just continue with localStorage fallback
    }
  }

  async appendTransaction(transaction: Transaction): Promise<void> {
    // Save to localStorage only
    this.saveToLocalStorage(transaction)
    console.log('Transaction saved to localStorage:', transaction)
  }

  async getTransactions(): Promise<Transaction[]> {
    // Only use localStorage since Google Apps Script doesn't support GET requests
    console.log('Loading transactions from localStorage');
    return this.getFromLocalStorage();
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }

  private saveToLocalStorage(transaction: Transaction): void {
    const existingTransactions = this.getFromLocalStorage()
    existingTransactions.unshift(transaction)
    localStorage.setItem('recharge-transactions', JSON.stringify(existingTransactions))
  }

  private getFromLocalStorage(): Transaction[] {
    if (typeof window === 'undefined') return []

    const stored = localStorage.getItem('recharge-transactions')
    if (!stored) return []

    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  // Clear all transactions (for testing/reset)
  clearTransactions(): void {
    localStorage.removeItem('recharge-transactions')
    console.log('All transactions cleared')
  }

  // Reset wallet balance to default
  resetWalletBalance(): void {
    localStorage.removeItem('wallet-balance')
    console.log('Wallet balance reset to default')
  }

  // Reset all data (wallet and transactions)
  resetAllData(): void {
    this.clearTransactions()
    this.resetWalletBalance()
    console.log('All data reset - wallet balance and transactions cleared')
  }

  // Import data from Google Sheet manually
  importFromGoogleSheet(googleSheetData: Array<{ amount: number, dateTime: string }>): void {
    const transactions: Transaction[] = googleSheetData.map(row => {
      const [datePart, timePart] = row.dateTime.split(' ');
      return {
        amount: row.amount,
        date: datePart,
        time: timePart
      };
    });

    localStorage.setItem('recharge-transactions', JSON.stringify(transactions.reverse()));
    console.log('Imported', transactions.length, 'transactions from Google Sheet');
  }

  // Save wallet balance to Google Sheets
  async saveWalletBalance(balance: number): Promise<void> {
    try {
      const response = await fetch(this.scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: 'cors',
        body: JSON.stringify({
          action: "saveWallet",
          balance: balance.toFixed(2)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log('Wallet balance saved to Google Sheets:', balance)
      // Also save to localStorage as backup
      localStorage.setItem('wallet-balance', balance.toString())
    } catch (error) {
      console.error('Error saving wallet balance to Google Sheets:', error)
      // Fallback to localStorage only
      localStorage.setItem('wallet-balance', balance.toString())
    }
  }

  // Get wallet balance from localStorage (Google Sheets would need GET support for full implementation)
  getWalletBalance(): number {
    const stored = localStorage.getItem('wallet-balance')
    if (stored) {
      return parseFloat(stored)
    }
    return 5000.0 // Default balance
  }
}

// Singleton instance with your Apps Script URL
export const googleSheetsService = new GoogleSheetsService(
  'https://script.google.com/macros/s/AKfycbzkL4OGYCZk6py0RX5A-3RRG5x_Hff8JvVBOq2l25vFKkljQhQ5TmioFARK2iI2cjs4/exec'
)
