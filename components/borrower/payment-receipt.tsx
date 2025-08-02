"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Printer, Download } from "lucide-react"
import type { LoanPayment } from "@/lib/types"

interface PaymentReceiptProps {
  payment: LoanPayment
  borrowerName: string
  lenderName: string
}

export function PaymentReceipt({ payment, borrowerName, lenderName }: PaymentReceiptProps) {
  // Only show receipt for completed payments
  if (payment.payment_status !== "completed") {
    return null
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="print:shadow-none">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h2 className="text-xl font-bold">Payment Receipt</h2>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <Card className="border-2 print:border-0 print:shadow-none">
        <CardContent className="p-6">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">Payment Receipt</h1>
            <p className="text-gray-500">Credlio Loan Payment</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">Receipt Number:</h3>
              <p>{payment.transaction_reference || payment.id.substring(0, 8)}</p>
            </div>
            <div className="text-right">
              <h3 className="font-medium text-gray-700">Payment Date:</h3>
              <p>{new Date(payment.payment_date || payment.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="my-4 border-b border-t py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-700">From:</h3>
                <p className="font-medium">{borrowerName}</p>
                <p className="text-gray-600">Borrower</p>
              </div>
              <div className="text-right">
                <h3 className="font-medium text-gray-700">To:</h3>
                <p className="font-medium">{lenderName}</p>
                <p className="text-gray-600">Lender</p>
              </div>
            </div>
          </div>

          <div className="my-6">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3">
                    Loan Payment - Due {new Date(payment.due_date).toLocaleDateString()}
                    <br />
                    <span className="text-sm text-gray-500">
                      Loan ID: {payment.loan_request_id.substring(0, 8)}
                    </span>
                  </td>
                  <td className="py-3 text-right font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency_code,
                    }).format(payment.amount_paid || payment.amount_due)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <th className="py-3 text-left">Total Paid</th>
                  <th className="py-3 text-right font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency_code,
                    }).format(payment.amount_paid || payment.amount_due)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-1 font-medium text-gray-700">Payment Method:</h3>
            <p>{payment.payment_method || "Not specified"}</p>

            {payment.notes && (
              <div className="mt-3">
                <h3 className="mb-1 font-medium text-gray-700">Notes:</h3>
                <p className="text-gray-600">{payment.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>This is an official receipt for your loan payment.</p>
            <p className="mt-1">Thank you for your payment.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
