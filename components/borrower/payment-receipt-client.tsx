"use client"

import { useState } from "react"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Download, Printer, CheckCircle } from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export function PaymentReceiptClient({ payment }: { payment: any }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPDF = async () => {
    setIsDownloading(true)
    const receiptElement = document.getElementById("receipt")

    if (receiptElement) {
      try {
        const canvas = await html2canvas(receiptElement, {
          scale: 2,
          logging: false,
          useCORS: true,
        })

        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        })

        const imgWidth = 210
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
        pdf.save(`payment-receipt-${payment.id.substring(0, 8)}.pdf`)
      } catch (err) {
        console.error("Error generating PDF:", err)
      }
    }
    setIsDownloading(false)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href={`/borrower/payments/${payment.id}`} className="flex items-center text-blue-600 hover:underline mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Payment Details
      </Link>

      <div className="flex justify-end mb-4 space-x-2">
        <Button variant="outline" className="flex items-center gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
        <Button
          variant="default"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={handleDownloadPDF}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>Preparing PDF...</>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      <Card className="border-2 print:border-0 print:shadow-none" id="receipt">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg border-b pb-6">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-blue-800">Payment Receipt</CardTitle>
              <p className="text-blue-600 font-medium">#{payment.id.substring(0, 8)}</p>
            </div>
            <div className="flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Payment Successful</span>
            </div>
          </div>
        </CardHeader>

        <div className="p-8 print:p-0">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-sm font-medium text-gray-500 mb-2">From</h2>
              <p className="font-medium text-lg">{payment.borrower?.full_name || "Borrower"}</p>
              {payment.borrower?.email && <p className="text-sm text-gray-600">{payment.borrower.email}</p>}
              {payment.borrower?.phone_number && (
                <p className="text-sm text-gray-600">{payment.borrower.phone_number}</p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-sm font-medium text-gray-500 mb-2">To</h2>
              <p className="font-medium text-lg">{payment.lender?.full_name || "Lender"}</p>
              {payment.lender?.email && <p className="text-sm text-gray-600">{payment.lender.email}</p>}
              {payment.lender?.phone_number && <p className="text-sm text-gray-600">{payment.lender.phone_number}</p>}
            </div>
          </div>

          <div className="border-t border-b py-6 mb-8">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Payment Date</h2>
                <p className="font-medium">
                  {new Date(payment.payment_date || payment.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Payment Method</h2>
                <p className="font-medium capitalize">
                  {(payment.payment_method || "Not specified").replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Reference</h2>
                <p className="font-medium">{payment.transaction_reference || "N/A"}</p>
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-1">Loan Purpose</h2>
                <p className="font-medium">
                  {payment.loan_request?.purpose || `Loan #${payment.loan_request_id.substring(0, 8)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 bg-gray-50 rounded-tl-lg">Description</th>
                  <th className="text-right py-3 px-2 bg-gray-50 rounded-tr-lg">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4 px-2">Loan Payment</td>
                  <td className="text-right py-4 px-2 font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency_code,
                    }).format(payment.amount_paid || payment.amount_due)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <th className="text-left py-3 px-2 bg-gray-50 rounded-bl-lg">Total</th>
                  <th className="text-right py-3 px-2 bg-gray-50 rounded-br-lg text-blue-700">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency_code,
                    }).format(payment.amount_paid || payment.amount_due)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          {payment.notes && (
            <div className="mb-8 bg-gray-50 p-4 rounded-lg">
              <h2 className="text-sm font-medium text-gray-500 mb-2">Notes</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line">{payment.notes}</p>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 border-t pt-6">
            <p>This receipt confirms that payment has been received.</p>
            <p className="mt-1">
              Generated on{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <CardFooter className="print:hidden border-t bg-gray-50 flex justify-between py-4">
          <p className="text-xs text-gray-500">Receipt ID: {payment.id}</p>
          <p className="text-xs text-gray-500">
            Confirmed by {payment.lender?.full_name || "Lender"} on {new Date(payment.updated_at).toLocaleString()}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
