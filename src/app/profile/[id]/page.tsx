"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle } from "lucide-react"
import supabase from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface SharedUser {
  id: string
  user_name: string
  email: string
  wallet_address?: string
  created_at: string
  from_metadata?: boolean
}

interface PaymentRecord {
  id: string
  shared_user_id: string
  payment_date: string
  payment_status: boolean
  payment_amount: number
  created_at: string
  updated_at: string
  paid_date: string
  metadata_uri?: string
}

interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export default function PaymentTracker() {
  const router = useRouter();
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserWallet, setNewUserWallet] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("0")
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, "0"))
  const [activeTab, setActiveTab] = useState("manage")

  // Available years from 2023 to 2028
  const years = ["2023", "2024", "2025", "2026", "2027", "2028"]

  // Months with names and values
  const months = [
    { value: "01", name: "January" },
    { value: "02", name: "February" },
    { value: "03", name: "March" },
    { value: "04", name: "April" },
    { value: "05", name: "May" },
    { value: "06", name: "June" },
    { value: "07", name: "July" },
    { value: "08", name: "August" },
    { value: "09", name: "September" },
    { value: "10", name: "October" },
    { value: "11", name: "November" },
    { value: "12", name: "December" },
  ]

  // Get month name from value
  const getMonthName = (monthValue: string) => {
    return months.find((m) => m.value === monthValue)?.name || monthValue
  }

  const getCurrentMetadataUri = () => {
  const urlPath = window.location.pathname.split('/profile/')[1];
  return decodeURIComponent(urlPath);
};

  // Add these new state variables near the top of your component
  const [subscription, setSubscription] = useState({
    title: "Loading...",
    description: "Loading subscription details...",
    paymentAmount: 0,
    billingCycle: "Monthly",
    status: "inactive",
    image: "",
    startDate: "",
    endDate: "",
    paymentDate: "",
    proof: "N/A"
  });

  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Format wallet address for display
  const formatWalletAddress = (address?: string) => {
    if (!address || address === "None" || address === "") return "";
    return address.length > 8 
      ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}`
      : address;
  };

  // Get wallet address by user ID
  const getWalletAddress = (userId: string) => {
    const user = sharedUsers.find((u) => u.id === userId);
    return user?.wallet_address || "";
  };

  // Update the useEffect for fetching subscription data
  useEffect(() => {
    async function fetchSubscriptionData() {
      try {
        setLoadingSubscription(true);
        
        // Get the subscription URI from the URL
        const urlPath = window.location.pathname.split('/profile/')[1];
        const metadataUri = decodeURIComponent(urlPath);
        console.log("Fetching metadata from:", metadataUri);

        // Get current auth session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/authentication');
          return;
        }
        
        // Fetch metadata from the URI
        try {
          const response = await fetch(metadataUri);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch metadata: ${response.status}`);
          }
          
          const metadata = await response.json();
          console.log("Full metadata:", metadata); // Log the full metadata for debugging
          
          // Extract attribute values
          const price = metadata.attributes?.find((attr: NFTAttribute) => attr.trait_type === "Price")?.value || "Unknown";
          const startDate = metadata.attributes?.find((attr: NFTAttribute) => attr.trait_type === "Start Date")?.value || "Unknown";
          const endDate = metadata.attributes?.find((attr: NFTAttribute) => attr.trait_type === "End Date")?.value || "Unknown";
          const paymentDate = metadata.attributes?.find((attr: NFTAttribute) => attr.trait_type === "Payment Date")?.value || "Unknown";
          const proof = metadata.attributes?.find((attr: NFTAttribute) => attr.trait_type === "Proof")?.value || "N/A";
          const billingCycle = metadata.attributes?.find((attr: NFTAttribute) => attr.trait_type === "Billing Cycle")?.value || "Monthly";
          
          // Update subscription state with metadata
          setSubscription({
            title: metadata.name || "Premium Subscription",
            description: metadata.description || "Monthly access to exclusive content",
            paymentAmount: typeof price === 'number' ? price : Number(price) || 0,
            billingCycle: billingCycle,
            status: "active", // Assuming NFTs are active by default
            image: metadata.image || "",
            startDate: startDate,
            endDate: endDate,
            paymentDate: paymentDate,
            proof: proof
          });
          
          // Update payment amount for the form
          if (typeof price === 'number' || !isNaN(Number(price))) {
            setPaymentAmount(price.toString());
          }

          setSharedUsers([]);

          
          // IMPORTANT: Extract and process shared users from metadata
          if (metadata.shared_users && Array.isArray(metadata.shared_users) && metadata.shared_users.length > 0) {
  console.log("Found shared users in metadata:", metadata.shared_users);
  
  // Create or update users from metadata in the database
  const dbPromises = metadata.shared_users.map(async (user: any) => {
    // First check if user already exists by name
    const { data: existingUser, error: checkError } = await supabase
      .from("payment_users")
      .select("*")
      .eq("user_name", user.name)
      .maybeSingle();
      
    if (checkError) {
      console.error("Error checking for existing user:", checkError);
      return null;
    }
    
    if (existingUser) {
      // User exists, update wallet if needed
      if (user.wallet_address && user.wallet_address !== existingUser.wallet_address) {
        const { data: updatedUser, error: updateError } = await supabase
          .from("payment_users")
          .update({ wallet_address: user.wallet_address })
          .eq("id", existingUser.id)
          .select();
          
        if (updateError) {
          console.error("Error updating user wallet:", updateError);
          return existingUser;
        }
        
        return updatedUser?.[0] || existingUser;
      }
      
      return existingUser;
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from("payment_users")
        .insert({
          user_name: user.name,
          email: "",
          wallet_address: user.wallet_address || null,
          from_metadata: true // Keep this flag to show the source
        })
        .select();
        
      if (insertError) {
        console.error("Error creating user from metadata:", insertError);
        return null;
      }
      
      return newUser?.[0] || null;
    }
  });
  
  try {
    // Wait for all database operations to complete
    const dbUsers = await Promise.all(dbPromises);
    // Filter out nulls and set as shared users
    setSharedUsers(dbUsers.filter(Boolean));
  } catch (dbError) {
    console.error("Error processing metadata users:", dbError);
  }
}
          
        } catch (metadataError) {
          console.error('Error fetching NFT metadata:', metadataError);
          
          // Fallback to default values
          setSubscription({
            title: "Premium Subscription",
            description: "Monthly access to exclusive content",
            paymentAmount: Number(paymentAmount) || 25.00,
            billingCycle: "Monthly",
            status: "inactive",
            image: "",
            startDate: "Not available",
            endDate: "Not available",
            paymentDate: "Not available",
            proof: "N/A"
          });
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        
        // Set default subscription data in case of error
        setSubscription({
          title: "Premium Subscription",
          description: "Monthly access to exclusive content",
          paymentAmount: Number(paymentAmount) || 25.00,
          billingCycle: "Monthly",
          status: "inactive",
          image: "",
          startDate: "Not available",
          endDate: "Not available",
          paymentDate: "Not available",
          proof: "N/A"
        });
      } finally {
        setLoadingSubscription(false);
      }
    }
    
    fetchSubscriptionData();
  }, [router, paymentAmount]);

  // Fetch shared users and payment records
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch shared users
        const { data: usersData, error: usersError } = await supabase
          .from("payment_users")
          .select("*")
          .order("user_name")

        if (usersError) throw usersError
        
        // Initialize shared users with DB data but don't overwrite metadata users
        setSharedUsers(prevUsers => {
          const metadataUsers = prevUsers.filter(u => u.from_metadata);
          // Combine database users with metadata users
          return [
            ...(usersData || []).map(user => ({
              ...user,
              from_metadata: false
            })),
            ...metadataUsers
          ];
        });

        // Fetch payment records
        const { data: paymentsData, error: paymentsError } = await supabase.from("payment_records").select("*")

        if (paymentsError) throw paymentsError
        setPaymentRecords(paymentsData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Add a new shared user
  const handleAddUser = async () => {
    if (!newUserName.trim()) return

    try {
      const { data, error } = await supabase
        .from("payment_users")
        .insert({
          user_name: newUserName.trim(),
          email: newUserEmail.trim() || null,
          wallet_address: newUserWallet.trim() || null,
        })
        .select()

      if (error) throw error

      if (data) {
        setSharedUsers([...sharedUsers, {...data[0], from_metadata: false}])
        setNewUserName("")
        setNewUserEmail("")
        setNewUserWallet("")
      }
    } catch (error) {
      console.error("Error adding user:", error)
    }
  }

  // Update payment status
  // Simplified payment update function
const handleUpdatePayment = async (userId: string, status: boolean) => {
  // Create a payment date string in YYYY-MM format
  const paymentDate = `${selectedYear}-${selectedMonth}`;
  const currentDate = new Date().toISOString();

  try {
    // Check if payment record already exists
    const existingRecord = paymentRecords.find(
      (p) => p.shared_user_id === userId && p.payment_date === paymentDate
    );

    if (existingRecord) {
      console.log("Updating payment status in Supabase:", existingRecord.id);
      
      // Update the record
      const { data, error } = await supabase
        .from("payment_records")
        .update({ 
          payment_status: status,
          paid_date: status ? currentDate : null,
          updated_at: currentDate,
          metadata_uri: decodeURIComponent(window.location.pathname.split('/profile/')[1])

        })
        .eq("id", existingRecord.id)
        .select();

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      // Update local state
      if (data && data.length > 0) {
        setPaymentRecords(paymentRecords.map((p) => 
          p.id === existingRecord.id ? data[0] : p
        ));
      } else {
        setPaymentRecords(paymentRecords.map((p) => 
          p.id === existingRecord.id ? { ...p, payment_status: status, paid_date: status ? currentDate : "" } : p
        ));
      }
    } else {
      // Create new record in database
      const { data, error } = await supabase
        .from("payment_records")
        .insert({
          shared_user_id: userId, // Now this is always a valid UUID
          payment_date: paymentDate,
          payment_status: status,
          payment_amount: typeof subscription.paymentAmount === 'number' ? 
            subscription.paymentAmount : Number(subscription.paymentAmount) || 0,
          paid_date: status ? currentDate : null,
          updated_at: currentDate,
          metadata_uri: window.location.pathname.split('/profile/')[1]
        })
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      // Update local state
      if (data && data.length > 0) {
        setPaymentRecords([...paymentRecords, data[0]]);
      }
    }
  } catch (error) {
    console.error("Error updating payment:", error);
    alert(`Failed to update payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

  const getPaymentStatus = (userId: string) => {
  const paymentDate = `${selectedYear}-${selectedMonth}`;
  const record = paymentRecords.find((p) => p.shared_user_id === userId && p.payment_date === paymentDate);
  return record?.payment_status || false;
}

  // Get payment amount for a user in the selected year/month
  const getPaymentAmount = (userId: string) => {
    const paymentDate = `${selectedYear}-${selectedMonth}`
    const record = paymentRecords.find((p) => p.shared_user_id === userId && p.payment_date === paymentDate)
    return record?.payment_amount || 
      (typeof subscription.paymentAmount === 'number' 
        ? subscription.paymentAmount 
        : Number(subscription.paymentAmount) || 0)
  }

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = sharedUsers.find((u) => u.id === userId)
    return user ? user.user_name : "Unknown User"
  }

  // Get all payment records for a specific year
const getPaymentsByYear = (year: string) => {
  const currentUri = getCurrentMetadataUri();
  return paymentRecords.filter((record) => 
    record.payment_date.startsWith(year) && 
    record.metadata_uri === currentUri &&
    record.payment_status === true
  );
};

// Update getPaymentsByYearAndMonth to filter by metadata URI and payment status
const getPaymentsByYearAndMonth = (year: string, month: string) => {
  const paymentDate = `${year}-${month}`;
  const currentUri = getCurrentMetadataUri();
  return paymentRecords.filter((record) => 
    record.payment_date === paymentDate && 
    record.metadata_uri === currentUri &&
    record.payment_status === true
  );
};

  const getPaymentPaidDate = (userId: string) => {
    const paymentDate = `${selectedYear}-${selectedMonth}`
    const record = paymentRecords.find((p) => p.shared_user_id === userId && p.payment_date === paymentDate)
    return record?.paid_date || null
  }

  // Apply dark indigo/cyan gradient theme to the page
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-800/30 to-cyan-800/30 rounded-xl blur-xl -z-10"></div>
          <Card className="w-full bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl rounded-xl overflow-hidden">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                Payment Tracker
              </h1>
              <p className="text-slate-400">Track monthly payments for shared expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Subscription Details */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-800/30 to-cyan-800/30 rounded-xl blur-xl -z-10"></div>
          <Card className="w-full bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl rounded-xl overflow-hidden">

            <CardHeader>
              <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                Current Subscription
              </CardTitle>
              <CardDescription className="text-slate-400">
                Details for the subscription you're currently managing
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {loadingSubscription ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-indigo-500/20 to-cyan-500/20"></div>
                    <div className="mt-4 text-white text-sm">Loading subscription...</div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  {/* Subscription NFT Image */}
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 to-cyan-600/30 group-hover:opacity-70 transition-opacity"></div>
                    {subscription.image ? (
                      <img 
                        src={subscription.image} 
                        alt={subscription.title}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Subscription Info */}
                  <div className="flex-grow space-y-4 text-center md:text-left">
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        {subscription.title}
                      </h1>
                      <p className="text-slate-400">{subscription.description}</p>
                    </div>
                    
                    {/* Subscription Details */}
                    <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-slate-300 mb-1">Payment Amount</h3>
                          <p className="text-xl font-semibold text-indigo-300">${typeof subscription.paymentAmount === 'number' ? subscription.paymentAmount.toFixed(2) : subscription.paymentAmount}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-300 mb-1">Billing Cycle</h3>
                          <p className="text-indigo-300">{subscription.billingCycle}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-300 mb-1">Status</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            subscription.status === 'active' 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {subscription.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-300 mb-1">Payment Date</h3>
                          <p className="text-indigo-300">{subscription.paymentDate}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-300 mb-1">Start Date</h3>
                          <p className="text-indigo-300">{subscription.startDate}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-300 mb-1">End Date</h3>
                          <p className="text-indigo-300">{subscription.endDate}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <h3 className="text-sm font-medium text-slate-300 mb-1">Proof</h3>
                          <p className="text-indigo-300 break-words">{subscription.proof}</p>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Period Selection and Add User Section */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          <Card className="lg:col-span-1 bg-slate-800/50 backdrop-blur-md border border-white/10 shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle className="text-indigo-300">Period Selection</CardTitle>
              <CardDescription className="text-slate-400">Select year and month to manage payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-white">
                <div>
                  <Label className="mb-2 " htmlFor="yearSelect">Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="yearSelect" className="w-lg">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 w-full" htmlFor="monthSelect">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger id="monthSelect" className="w-lg">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Current Period</h3>
                  <div className="bg-gradient-to-r from-indigo-600 to-cyan-700 w-full p-3 rounded-md text-white">
                    <p className="font-medium ">
                      {getMonthName(selectedMonth)} {selectedYear}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="manage" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 bg-slate-800 rounded-lg overflow-hidden">
            <TabsTrigger
              value="manage"
              className={`py-2 text-center font-medium transition-all duration-300 ${
                activeTab === "manage"
                  ? "bg-gradient-to-r from-indigo-600 to-cyan-700 w-full text-white"
                  : "bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-white"
              }`}
            >
              Manage Payments
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={`py-2 text-center font-medium transition-all duration-300 ${
                activeTab === "history"
                  ? "bg-gradient-to-r from-indigo-600 to-cyan-700 w-full text-white"
                  : "bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-white "
              }`}
            >
              Payment History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6">
            <Card className="bg-slate-800/50 backdrop-blur-md border border-white/10 shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle className="text-white">Payments for {getMonthName(selectedMonth)} {selectedYear}</CardTitle>
                <CardDescription>Mark payments as paid for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 text-white">
                  {loading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>Loading users...</p>
                      </div>
                    </div>
                  ) : sharedUsers.length === 0 ? (
                    <div className="bg-muted rounded-lg p-6 text-center">
                      <p className="text-muted-foreground">No users added yet. Add users to track payments.</p>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table >
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-indigo-600 to-cyan-700 w-full text-white rounded-md">
                            <TableHead className="text-white">User</TableHead>
                            <TableHead className="text-white">Amount</TableHead>
                            <TableHead className="text-white">Status</TableHead>
                            <TableHead className="text-white">Paid Date</TableHead>
                            <TableHead className="text-right text-white">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sharedUsers.map((user) => {
                            const isPaid = getPaymentStatus(user.id)
                            const amount = getPaymentAmount(user.id)
                            const paidDate = getPaymentPaidDate(user.id)
                            return (
                              <TableRow key={user.id} className="hover:bg-indigo-900">
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{user.user_name}</p>
                                    <div className="flex flex-col space-y-1 text-gray-400 text-sm ">
                                      {user.email && <p>{user.email}</p>}
                                      {user.wallet_address && user.wallet_address !== "None" && (
                                        <p className="font-mono text-xs text-indigo-400">
                                          Wallet: {formatWalletAddress(user.wallet_address)}
                                        </p>
                                      )}
                                      {user.from_metadata && (
                                        <Badge className="w-fit bg-indigo-900/50 text-indigo-300 border-indigo-400/30">From NFT</Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>${amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-1 rounded-full text-sm font-medium ${
                                      isPaid ? "bg-green-800 text-white" : "bg-red-500 text-white"
                                    }`}
                                  >
                                    {isPaid ? "Paid" : "Unpaid"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {paidDate ? new Date(paidDate).toLocaleString() : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <button
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 cursor-pointer ${
                                      isPaid
                                        ? "bg-red-500 text-white hover:bg-red-600"
                                        : "bg-blue-500 text-white hover:bg-blue-600"
                                    }`}
                                    onClick={() => handleUpdatePayment(user.id, !isPaid)}
                                  >
                                    {isPaid ? "Mark Unpaid" : "Mark Paid"}
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-slate-800/50 backdrop-blur-md border border-white/10 shadow-xl rounded-xl">
              <CardHeader>
                <CardTitle className="text-white">Payment History</CardTitle>
                <CardDescription>View historical payment records organized by year and month</CardDescription>
              </CardHeader>
              <CardContent>
                {years.map((year) => {
                  const yearPayments = getPaymentsByYear(year)
                  if (yearPayments.length === 0) return null

                  return (
                    <div key={year} className="mb-8 last:mb-0">
                      <h3 className="text-lg font-medium mb-4 text-white">{year}</h3>
                      <div className="space-y-4">
                        {months.map((month) => {
                          const monthlyPayments = getPaymentsByYearAndMonth(year, month.value)
                          if (monthlyPayments.length === 0) return null

                          const paidCount = monthlyPayments.filter((p) => p.payment_status).length
                          const totalAmount = monthlyPayments.reduce(
                            (sum, payment) => (payment.payment_status ? sum + payment.payment_amount : sum),
                            0,
                          )
                          
                          const totalExpected = typeof subscription.paymentAmount === 'number' 
                            ? subscription.paymentAmount * monthlyPayments.length
                            : Number(subscription.paymentAmount) * monthlyPayments.length || 0;

                          return (
                            <div key={`${year}-${month.value}`} className="border rounded-md overflow-hidden">
                              <div className="bg-muted p-3 flex justify-between items-center">
                                <h4 className="font-medium">
                                  {month.name} {year}
                                </h4>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm">
                                    {paidCount}/{monthlyPayments.length} paid
                                  </span>
                                  <span className="font-medium">${totalAmount.toFixed(2)} / ${totalExpected.toFixed(2)}</span>
                                </div>
                              </div>

                              <Table >
                                <TableHeader className="bg-gradient-to-r from-indigo-600 to-cyan-700 w-full text-white">
                                  <TableRow >
                                    <TableHead className="text-white">User</TableHead>
                                    <TableHead className="text-white">Amount</TableHead>
                                    <TableHead className="text-white">Status</TableHead>
                                    <TableHead className="text-white">Paid Date</TableHead>
                                    <TableHead className="text-white">Last Updated</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {monthlyPayments.map((payment) => (
                                    <TableRow key={payment.id} className="text-white">
                                      <TableCell>
                                        <div>
                                          <p>{getUserName(payment.shared_user_id)}</p>
                                          {getWalletAddress(payment.shared_user_id) && (
                                            <p className="font-mono text-xs text-indigo-400">
                                              Wallet: {formatWalletAddress(getWalletAddress(payment.shared_user_id))}
                                            </p>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>${payment.payment_amount.toFixed(2)}</TableCell>
                                      <TableCell>
                                        <Badge variant={payment.payment_status ? "secondary" : "destructive"} className={payment.payment_status ? "bg-green-800 text-white" : "text-white"}>
                                          {payment.payment_status ? "Paid" : "Unpaid"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{payment.paid_date ? new Date(payment.paid_date).toLocaleString() : "-"}</TableCell>
                                      <TableCell>{new Date(payment.updated_at).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {paymentRecords.length === 0 && (
                  <div className="bg-muted rounded-lg p-6 text-center">
                    <p className="text-muted-foreground">No payment history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}