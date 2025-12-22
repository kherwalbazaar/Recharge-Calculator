"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { googleSheetsService, type Transaction } from "@/lib/google-sheets"

export default function RechargeCalculator() {
  const [rechargeAmount, setRechargeAmount] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [transactions, setTransactions] = useState<Array<{amount: number, date: string, time: string}>>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState<boolean>(false)
  const [addAmount, setAddAmount] = useState<string>("")
  const [walletError, setWalletError] = useState<string>("")

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
      time: time
    }
    
    try {
      // Save to Google Sheets
      await googleSheetsService.appendTransaction(newTransaction)
      
      // Update wallet balance and add transaction
      const newBalance = walletBalance - discountedAmount
      setWalletBalance(newBalance)
      setTransactions(prev => [newTransaction, ...prev])
      setRechargeAmount("")
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
    const amount = prompt("Enter amount to add to wallet:")
    
    if (amount === null) {
      return // User cancelled
    }
    
    const numAmount = Number.parseFloat(amount)
    
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid amount greater than 0")
      return
    }
    
    const newBalance = walletBalance + numAmount
    setWalletBalance(newBalance)
    
    // Save to localStorage only
    localStorage.setItem('wallet-balance', newBalance.toString())
    
    console.log("Added to wallet:", numAmount)
    
    // Show success message
    alert(`Successfully added ₹${numAmount.toFixed(2)} to wallet!`)
  }

  const handleRefreshData = async () => {
    try {
      // Import your actual Google Sheet data
      const googleSheetData = [
        { amount: 192.433, dateTime: "22-12-2025 09:14:32" },
        { amount: 289.133, dateTime: "22-12-2025 09:20:11" }
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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setRechargeAmount(value)

    const amount = Number.parseFloat(value)
    if (value && amount <= 0) {
      setError("Recharge amount must be greater than 0")
    } else {
      setError("")
    }
  }

  const showResults = rechargeAmount && Number.parseFloat(rechargeAmount) > 0 && !error
  const discountedAmount = showResults ? calculateRechargeAmount(Number.parseFloat(rechargeAmount)) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex justify-center items-center space-y-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 p-6 rounded-2xl">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white animate-pulse">
               KHERWAL BAZAAR
            </h1>
            <p className="text-2xl font-bold text-white">Recharge Calculator</p>
            <p className="text-lg text-white/90">Enter amount to recharge instantly</p>

            <div className="flex items-center justify-center gap-4 pt-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 p-1">
                <img src="/images/jio.jpg" alt="Jio" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-red-500 to-pink-400 p-1">
                <img src="/images/art-p-9.jpg" alt="Airtel" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 p-1">
                <img src="/images/vi.jpg" alt="VI" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-yellow-400 p-1">
                <img
                  src="/images/bsnl-app-transparent-logo-free-p.jpg"
                  alt="BSNL"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-2 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-medium">Wallet Balance</p>
                <p className="text-2xl font-bold text-foreground">₹{walletBalance.toFixed(2)}</p>
              </div>
              <Button onClick={handleAddWallet} size="sm" className="font-semibold">
                Add wallet
              </Button>
              <Button onClick={handleCheckUrl} size="sm" variant="outline" className="font-semibold">
                Check URL
              </Button>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6 text-primary"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                  />
                </svg>
              </div>
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
            {/* Recharge Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-base font-semibold">
                Recharge Amount (₹)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={rechargeAmount}
                onChange={handleAmountChange}
                className="h-12 text-lg"
                min="0"
                step="1"
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

        {/* Footer Disclaimer */}
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-center text-sm text-muted-foreground">
              <span className="font-semibold">Disclaimer:</span> This app is for calculation purposes only. No recharge
              service is provided.
            </p>
          </CardContent>
        </Card>

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
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {transaction.date} at {transaction.time}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      ₹{transaction.amount.toFixed(3)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5 text-green-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
