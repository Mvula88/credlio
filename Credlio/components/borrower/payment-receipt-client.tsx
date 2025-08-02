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
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/borrower/payments/${payment.id}`}
        className="mb-6 flex items-center text-blue-600 hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Payment Details
      </Link>

      <div className="mb-4 flex justify-end space-x-2">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => window.print()}
        >
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
        <CardHeader className="rounded-t-lg border-b bg-gradient-to-r from-blue-50 to-blue-100 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-blue-800">Payment Receipt</CardTitle>
              <p className="font-medium text-blue-600">#{payment.id.substring(0, 8)}</p>
            </div>
            <div className="flex items-center rounded-full bg-green-100 px-3 py-1 text-green-700">
              <CheckCircle className="mr-1 h-4 w-4" />
              <span className="text-sm font-medium">Payment Successful</span>
            </div>
          </div>
        </CardHeader>

        <div className="p-8 print:p-0">
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div className="rounded-lg bg-gray-50 p-4">
              <h2 className="mb-2 text-sm font-medium text-gray-500">From</h2>
              <p className="text-lg font-medium">{payment.borrower?.full_name || "Borrower"}</p>
              {payment.borrower?.email && (
                <p className="text-sm text-gray-600">{payment.borrower.email}</p>
              )}
              {payment.borrower?.phone_number && (
                <p className="text-sm text-gray-600">{payment.borrower.phone_number}</p>
              )}
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <h2 className="mb-2 text-sm font-medium text-gray-500">To</h2>
              <p className="text-lg font-medium">{payment.lender?.full_name || "Lender"}</p>
              {payment.lender?.email && (
                <p className="text-sm text-gray-600">{payment.lender.email}</p>
              )}
              {payment.lender?.phone_number && (
                <p className="text-sm text-gray-600">{payment.lender.phone_number}</p>
              )}
            </div>
          </div>

          <div className="mb-8 border-b border-t py-6">
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <h2 className="mb-1 text-sm font-medium text-gray-500">Payment Date</h2>
                <p className="font-medium">
                  {new Date(payment.payment_date || payment.updated_at).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
              <div>
                <h2 className="mb-1 text-sm font-medium text-gray-500">Payment Method</h2>
                <p className="font-medium capitalize">
                  {(payment.payment_method || "Not specified").replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="mb-1 text-sm font-medium text-gray-500">Reference</h2>
                <p className="font-medium">{payment.transaction_reference || "N/A"}</p>
              </div>
              <div>
                <h2 className="mb-1 text-sm font-medium text-gray-500">Loan Purpose</h2>
                <p className="font-medium">
                  {payment.loan_request?.purpose ||
                    `Loan #${payment.loan_request_id.substring(0, 8)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="rounded-tl-lg bg-gray-50 px-2 py-3 text-left">Description</th>
                  <th className="rounded-tr-lg bg-gray-50 px-2 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-4">Loan Payment</td>
                  <td className="px-2 py-4 text-right font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency_code,
                    }).format(payment.amount_paid || payment.amount_due)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <th className="rounded-bl-lg bg-gray-50 px-2 py-3 text-left">Total</th>
                  <th className="rounded-br-lg bg-gray-50 px-2 py-3 text-right text-blue-700">
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
            <div className="mb-8 rounded-lg bg-gray-50 p-4">
              <h2 className="mb-2 text-sm font-medium text-gray-500">Notes</h2>
              <p className="whitespace-pre-line text-sm text-gray-600">{payment.notes}</p>
            </div>
          )}

          <div className="border-t pt-6 text-center text-sm text-gray-500">
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
        <CardFooter className="flex justify-between border-t bg-gray-50 py-4 print:hidden">
          <p className="text-xs text-gray-500">Receipt ID: {payment.id}</p>
          <p className="text-xs text-gray-500">
            Confirmed by {payment.lender?.full_name || "Lender"} on{" "}
            {new Date(payment.updated_at).toLocaleString()}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
