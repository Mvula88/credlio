"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useState } from "react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

interface PaymentReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: any
}

export function PaymentReceiptDialog({ open, onOpenChange, payment }: PaymentReceiptDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPDF = async () => {
    setIsDownloading(true)
    const receiptElement = document.getElementById("receipt-dialog")

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

  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>Receipt #{payment.id.substring(0, 8)}</DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            className="flex items-center gap-2"
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

        <div id="receipt-dialog" className="rounded-lg border bg-white p-6">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold">Payment Receipt</h2>
            <p className="text-gray-500">#{payment.id.substring(0, 8)}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">From</h3>
              <p className="font-medium">{payment.borrower?.full_name || "Borrower"}</p>
              {payment.borrower?.email && <p className="text-sm">{payment.borrower.email}</p>}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">To</h3>
              <p className="font-medium">{payment.lender?.full_name || "Lender"}</p>
              {payment.lender?.email && <p className="text-sm">{payment.lender.email}</p>}
            </div>
          </div>

          <div className="mb-6 border-b border-t py-4">
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Date</h3>
                <p>{new Date(payment.payment_date || payment.updated_at).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                <p className="capitalize">
                  {(payment.payment_method || "Not specified").replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Reference</h3>
                <p>{payment.transaction_reference || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="font-medium text-green-600">Completed</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4">Loan Payment</td>
                  <td className="py-4 text-right font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency_code,
                    }).format(payment.amount_paid || payment.amount_due)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <th className="py-2 text-left">Total</th>
                  <th className="py-2 text-right">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency_code,
                    }).format(payment.amount_paid || payment.amount_due)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>This receipt confirms that payment has been received.</p>
            <p>Generated on {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
