"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { googleSheetsService, type Transaction } from "@/lib/google-sheets"
import { InstallPrompt } from "@/components/install-prompt"

export default function RechargeCalculator() {
  const [mobileNumber, setMobileNumber] = useState<string>("")
  const [rechargeAmount, setRechargeAmount] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<Array<{ amount: number, date: string, time: string, mobileNumber?: string, type?: 'recharge' | 'credit' }>>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState<boolean>(false)
  const [addAmount, setAddAmount] = useState<string>("")
  const [walletPassword, setWalletPassword] = useState<string>("")
  const [walletError, setWalletError] = useState<string>("")
  const [walletPasswordError, setWalletPasswordError] = useState<string>("")
  const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false)
  const [resetPassword, setResetPassword] = useState<string>("")
  const [passwordError, setPasswordError] = useState<string>("")

  const calculateRechargeAmount = (amount: number): number => {
    const discount = amount * 0.033
    return amount - discount
  }

  // Load wallet balance and transactions on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load wallet balance from Google Sheets/LocalStorage
        const savedBalance = googleSheetsService.getWalletBalance()
        setWalletBalance(savedBalance)
        console.log('Wallet balance loaded:', savedBalance)

        // Load transactions from localStorage
        const savedTransactions = await googleSheetsService.getTransactions()
        setTransactions(savedTransactions)
        console.log('Transactions loaded:', savedTransactions.length)
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    loadData()
  }, [])

  const handleRecharge = async () => {
    setIsLoading(true)
    const amount = Number.parseFloat(rechargeAmount)
    const discountedAmount = calculateRechargeAmount(amount)

    if (!rechargeAmount || amount <= 0) {
      setError("Please enter a valid recharge amount")
      setIsLoading(false)
      return
    }

    if (discountedAmount > walletBalance) {
      setError("Insufficient wallet balance")
      setIsLoading(false)
      return
    }

    // Create transaction record
    const now = new Date()
    const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    const newTransaction: Transaction = {
      amount: discountedAmount,
      date: date,
      time: time,
      mobileNumber: mobileNumber,
      type: 'recharge'
    }

    try {
      // Save to Google Sheets
      await googleSheetsService.appendTransaction(newTransaction)

      // Update wallet balance and add transaction
      const newBalance = walletBalance - discountedAmount
      setWalletBalance(newBalance)
      setTransactions(prev => [newTransaction, ...prev])
      setRechargeAmount("")
      setMobileNumber("") // Reset mobile number
      setError("")
      setIsConnected(true) // Set connection status to true on successful save

      // Save updated wallet balance to localStorage
      localStorage.setItem('wallet-balance', newBalance.toString())

      console.log("Recharge completed for amount:", discountedAmount)
    } catch (error) {
      console.error('Error saving transaction:', error)
      setError("Failed to save transaction. Please try again.")
      setIsConnected(false) // Set connection status to false on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddWallet = () => {
    setAddAmount("")
    setWalletPassword("")
    setIsWalletDialogOpen(true)
    setWalletError("")
    setWalletPasswordError("")
  }

  const handleConfirmAddWallet = () => {
    const numAmount = Number.parseFloat(addAmount)

    if (!addAmount || isNaN(numAmount) || numAmount <= 0) {
      setWalletError("Please enter a valid amount greater than 0")
      return
    }

    if (walletPassword !== "54557735") {
      setWalletPasswordError("Incorrect password!")
      return
    }

    const newBalance = walletBalance + numAmount
    setWalletBalance(newBalance)

    // Save to localStorage only
    localStorage.setItem('wallet-balance', newBalance.toString())

    // Create transaction record for wallet add
    const now = new Date()
    const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    const newTransaction: Transaction = {
      amount: numAmount,
      date: date,
      time: time,
      type: 'credit'
    }

    setTransactions(prev => [newTransaction, ...prev])

    // Save transaction to localStorage
    googleSheetsService.appendTransaction(newTransaction)

    console.log("Added to wallet:", numAmount)
    setIsWalletDialogOpen(false)
  }

  const handleRefreshData = async () => {
    try {
      // Import your actual Google Sheet data
      const googleSheetData = [
        { amount: 192.433, dateTime: "22-12-2025 09:14:32", mobileNumber: "9583252256", type: 'recharge' as const },
        { amount: 500.000, dateTime: "22-12-2025 09:18:00", type: 'credit' as const },
        { amount: 289.133, dateTime: "22-12-2025 09:20:11", mobileNumber: "9337496142", type: 'recharge' as const }
      ];

      googleSheetsService.importFromGoogleSheet(googleSheetData);

      // Reload the transactions
      const refreshedTransactions = await googleSheetsService.getTransactions()
      setTransactions(refreshedTransactions)
      console.log('Data imported from Google Sheet')
    } catch (error) {
      console.error('Error importing data:', error)
    }
  }

  const handleCheckUrl = () => {
    const isValid = googleSheetsService.isUrlValid()
    const message = isValid ?
      'Google Sheets URL is valid format' :
      'Google Sheets URL format is invalid'
    console.log('URL Check:', message)
    alert(message)
  }

  const handleTestConnection = async () => {
    try {
      console.log('Testing Google Sheets connection...')
      const isConnected = await googleSheetsService.testConnection()
      console.log('Connection result:', isConnected)
      alert(isConnected ? 'Connected to Google Sheets!' : 'Failed to connect to Google Sheets')
    } catch (error) {
      console.error('Test failed:', error)
      alert('Connection test failed: ' + (error as Error).message)
    }
  }

  const handleResetData = () => {
    setIsResetDialogOpen(true)
    setResetPassword("")
    setPasswordError("")
  }

  const handleResetWithPassword = () => {
    if (resetPassword === "54557735") {
      googleSheetsService.resetAllData()

      // Reset the UI state with wallet balance set to 0
      const zeroBalance = 0
      setWalletBalance(zeroBalance)
      setTransactions([])
      setRechargeAmount("")
      setError("")

      // Save the zero balance to localStorage
      localStorage.setItem('wallet-balance', zeroBalance.toString())

      setIsResetDialogOpen(false)
      alert('All data has been reset successfully!')
    } else {
      setPasswordError("Incorrect password!")
    }
  }

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers
    if (value === "" || /^\d+$/.test(value)) {
      // Limit to 10 digits
      if (value.length <= 10) {
        setMobileNumber(value)
      }
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only numbers
    if (value === "" || /^\d+$/.test(value)) {
      setRechargeAmount(value)

      const amount = Number.parseFloat(value)
      if (value && amount <= 0) {
        setError("Recharge amount must be greater than 0")
      } else {
        setError("")
      }
    }
  }

  const showResults = mobileNumber.length === 10 && rechargeAmount && Number.parseFloat(rechargeAmount) > 0 && !error
  const discountedAmount = showResults ? calculateRechargeAmount(Number.parseFloat(rechargeAmount)) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col items-center justify-start pb-8">
      {/* Header */}
      <div className="w-full flex justify-center items-center space-y-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 p-4 sm:p-6 shadow-md mb-6">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl lg:text-5xl font-bold tracking-tight text-white animate-pulse">
            KHERWAL BAZAAR
          </h1>
          <p className="text-lg sm:text-1.5xl lg:text-2xl font-bold text-white">Recharge Calculator</p>
          <p className="text-sm sm:text-lg text-white/90">Enter amount to recharge instantly</p>

          <div className="flex items-center justify-center gap-2 sm:gap-4 pt-4 sm:pt-6">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 p-1">
              <img src="/images/jio.jpg" alt="Jio" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-red-500 to-pink-400 p-1">
              <img src="/images/art-p-9.jpg" alt="Airtel" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 p-1">
              <img src="/images/vi.jpg" alt="VI" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 p-1">
              <img
                src="/images/bsnl-app-transparent-logo-free-p.jpg"
                alt="BSNL"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full space-y-4 sm:space-y-6 px-4">

        <Card className="shadow-lg border-2 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Wallet Balance</p>
                <p className="text-2xl font-bold text-foreground">₹{walletBalance.toFixed(2)}</p>
              </div>
              <Button size="sm" onClick={handleAddWallet}>Add wallet</Button>
              <Button size="sm" variant="destructive" onClick={handleResetData}>Reset Data</Button>

            </div>
          </CardContent>
        </Card>

        {/* Calculator Card */}
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Enter Recharge Amount</CardTitle>
            <CardDescription>Enter the amount you want to recharge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mobile Number */}
            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-base font-semibold">
                Mobile Number
              </Label>
              <Input
                id="mobile"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 10-digit mobile number"
                value={mobileNumber}
                onChange={handleMobileChange}
                className="h-12 text-lg"
                maxLength={10}
              />
            </div>

            {/* Recharge Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-semibold">
                Recharge Amount (₹)
              </Label>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter amount"
                value={rechargeAmount}
                onChange={handleAmountChange}
                className="h-12 text-lg"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">{error}</div>
            )}
          </CardContent>
        </Card>

        {showResults && (
          <Card className="shadow-xl border-2 bg-gradient-to-br from-card to-muted/20">
            <CardHeader>
              <CardTitle className="text-2xl">Recharge Amount</CardTitle>
              <CardDescription>3.30% discount applied</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-6 rounded-lg bg-primary/10 backdrop-blur space-y-1 border-2 border-primary/20">
                <p className="text-sm text-primary font-semibold">Amount to Pay</p>
                <p className="text-3xl font-bold text-primary">₹{discountedAmount.toFixed(3)}</p>
              </div>

              <Button
                onClick={handleRecharge}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Recharge"}
              </Button>
            </CardContent>
          </Card>
        )}



        {/* Recharge History */}
        {transactions.length > 0 && (
          <Card className="shadow-xl border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Recharge History</CardTitle>
                  <CardDescription>Your recent successful recharges</CardDescription>
                </div>
                <Button
                  onClick={handleRefreshData}
                  size="sm"
                  variant="outline"
                  className="font-semibold"
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50 to-pink-50 dark:from-green-900/10 dark:to-pink-900/10 border border-border shadow-sm">
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {transaction.type === 'credit' ? "Wallet Money Added" : (transaction.mobileNumber || "Recharge")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.date} at {transaction.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toFixed(3)}
                    </p>
                    <p className={`text-[10px] font-medium ${transaction.type === 'credit' ? 'text-green-500' : 'text-green-500'}`}>
                      {transaction.type === 'credit' ? "Money Added successfully" : "Recharge successfully"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add Wallet Dialog */}
        <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 border-none text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Add to Wallet</DialogTitle>
              <DialogDescription className="text-white/90">
                Enter the amount you want to add to your wallet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet-amount">Amount (₹)</Label>
                <Input
                  id="wallet-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={addAmount}
                  onChange={(e) => {
                    setAddAmount(e.target.value)
                    setWalletError("")
                  }}
                  className={`bg-white text-black placeholder:text-gray-500 border-none ${walletError ? "ring-2 ring-red-300" : ""}`}
                  min="0"
                  step="1"
                />
                {walletError && (
                  <p className="text-sm text-white font-medium bg-red-600/20 p-1 rounded px-2 mt-1">{walletError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="wallet-password" className="text-white">Password</Label>
                <Input
                  id="wallet-password"
                  type="password"
                  placeholder="Enter password"
                  value={walletPassword}
                  onChange={(e) => {
                    setWalletPassword(e.target.value)
                    setWalletPasswordError("")
                  }}
                  className={`bg-white text-black placeholder:text-gray-500 border-none ${walletPasswordError ? "ring-2 ring-red-300" : ""}`}
                />
                {walletPasswordError && (
                  <p className="text-sm text-white font-medium bg-red-600/20 p-1 rounded px-2 mt-1">{walletPasswordError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConfirmAddWallet} className="flex-1">
                  Add Money
                </Button>
                <Button onClick={() => setIsWalletDialogOpen(false)} className="flex-1 bg-white text-red-500 hover:bg-gray-100 hover:text-red-600 border-none">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 border-none text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Reset All Data</DialogTitle>
              <DialogDescription className="text-white/90">
                Enter password to reset all data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">Password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="Enter password"
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.value)
                    setPasswordError("")
                  }}
                  className={`bg-white text-black placeholder:text-gray-500 border-none ${passwordError ? "ring-2 ring-red-300" : ""}`}
                />
                {passwordError && (
                  <p className="text-sm text-white font-medium bg-red-600/20 p-1 rounded px-2 mt-1">{passwordError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleResetWithPassword} className="flex-1">
                  Reset Data
                </Button>
                <Button onClick={() => setIsResetDialogOpen(false)} className="flex-1 bg-white text-red-500 hover:bg-gray-100 hover:text-red-600 border-none">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* PWA Install Prompt */}
        <InstallPrompt />
      </div>
    </div>
  )
}
