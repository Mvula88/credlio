"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription>Receipt #{payment.id.substring(0, 8)}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-4">
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

        <div id="receipt-dialog" className="bg-white p-6 rounded-lg border">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Payment Receipt</h2>
            <p className="text-gray-500">#{payment.id.substring(0, 8)}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
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

          <div className="border-t border-b py-4 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Date</h3>
                <p>{new Date(payment.payment_date || payment.updated_at).toLocaleDateString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                <p className="capitalize">{(payment.payment_method || "Not specified").replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Reference</h3>
                <p>{payment.transaction_reference || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="text-green-600 font-medium">Completed</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-4">Loan Payment</td>
                  <td className="text-right py-4 font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: payment.currency_code,
                    }).format(payment.amount_paid || payment.amount_due)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <th className="text-left py-2">Total</th>
                  <th className="text-right py-2">
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
