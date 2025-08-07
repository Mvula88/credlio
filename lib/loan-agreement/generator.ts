import PDFDocument from 'pdfkit'
import { format } from 'date-fns'

interface LoanAgreementData {
  loan: {
    id: string
    amount_requested: number
    purpose: string
    created_at: string
    borrower: {
      full_name: string
      email: string
      phone_number?: string
      address?: string
    }
    lender: {
      full_name: string
      email: string
      phone_number?: string
      business_name?: string
      business_registration_number?: string
      address?: string
    }
    country: {
      name: string
      currency_code: string
      currency_symbol: string
    }
  }
  loanTerms: {
    loanAmount: number
    interestRate: number
    loanTerm: number
    repaymentFrequency: string
    collateralDescription: string
    additionalTerms: string
    latePaymentPenalty: number
    defaultGracePeriod: number
  }
}

export async function generateLoanAgreementPDF(data: LoanAgreementData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const buffers: Buffer[] = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })

      const { loan, loanTerms } = data
      const currency = loan.country.currency_symbol || loan.country.currency_code

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('LOAN AGREEMENT', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica').text(`Agreement No: LA-${loan.id.substring(0, 8).toUpperCase()}`, { align: 'center' })
      doc.moveDown(1)

      // Date and location
      const today = new Date()
      doc.text(`Date: ${format(today, 'dd/MM/yyyy')}`)
      doc.text(`Location: ${loan.country.name}`)
      doc.moveDown(1)

      // Parties section
      doc.fontSize(14).font('Helvetica-Bold').text('PARTIES TO THIS AGREEMENT')
      doc.moveDown(0.5)

      doc.fontSize(12).font('Helvetica-Bold').text('LENDER:')
      doc.font('Helvetica')
      doc.text(`Name: ${loan.lender.full_name}`)
      if (loan.lender.business_name) {
        doc.text(`Business: ${loan.lender.business_name}`)
      }
      if (loan.lender.business_registration_number) {
        doc.text(`Registration No: ${loan.lender.business_registration_number}`)
      }
      doc.text(`Email: ${loan.lender.email}`)
      if (loan.lender.phone_number) {
        doc.text(`Phone: ${loan.lender.phone_number}`)
      }
      if (loan.lender.address) {
        doc.text(`Address: ${loan.lender.address}`)
      }
      doc.moveDown(0.5)

      doc.font('Helvetica-Bold').text('BORROWER:')
      doc.font('Helvetica')
      doc.text('Name: _________________________ (To be filled by borrower)')
      doc.text('ID Number: _________________________ (To be filled by borrower)')
      doc.text('Phone Number: _________________________ (To be filled by borrower)')
      doc.text(`Email: ${loan.borrower.email}`)
      if (loan.borrower.address) {
        doc.text(`Address: ${loan.borrower.address}`)
      } else {
        doc.text('Address: _________________________ (To be filled by borrower)')
      }
      doc.moveDown(1)

      // Loan terms section
      doc.fontSize(14).font('Helvetica-Bold').text('LOAN TERMS AND CONDITIONS')
      doc.moveDown(0.5)

      doc.fontSize(12).font('Helvetica')
      doc.text(`1. LOAN AMOUNT: ${currency} ${loanTerms.loanAmount.toLocaleString()}`)
      doc.text(`2. INTEREST RATE: ${loanTerms.interestRate}% per ${loanTerms.repaymentFrequency.toLowerCase()}`)
      doc.text(`3. LOAN TERM: ${loanTerms.loanTerm} ${loanTerms.repaymentFrequency.toLowerCase()}(s)`)
      doc.text(`4. REPAYMENT FREQUENCY: ${loanTerms.repaymentFrequency}`)
      doc.text(`5. PURPOSE: ${loan.purpose}`)
      
      if (loanTerms.collateralDescription) {
        doc.text(`6. COLLATERAL: ${loanTerms.collateralDescription}`)
      }
      doc.moveDown(1)

      // Legal obligations
      doc.fontSize(14).font('Helvetica-Bold').text('BORROWER OBLIGATIONS AND CONSEQUENCES')
      doc.moveDown(0.5)
      
      doc.fontSize(12).font('Helvetica')
      doc.text('The Borrower hereby agrees to the following terms:', { underline: true })
      doc.moveDown(0.3)
      
      doc.text('1. REPAYMENT OBLIGATION: The Borrower shall repay the full loan amount plus accrued interest according to the agreed schedule.')
      doc.moveDown(0.3)
      
      doc.text(`2. LATE PAYMENT PENALTY: A penalty of ${loanTerms.latePaymentPenalty}% of the outstanding amount will be charged for each ${loanTerms.repaymentFrequency.toLowerCase()} the payment is late.`)
      doc.moveDown(0.3)
      
      doc.text(`3. DEFAULT CONSEQUENCES: If the Borrower fails to make payment within ${loanTerms.defaultGracePeriod} days of the due date:`)
      doc.text('   a) The Borrower will be marked as a HIGH-RISK or BAD BORROWER in the Credlio system')
      doc.text('   b) The Borrower\'s credit profile will be negatively affected, limiting future borrowing opportunities')
      doc.text('   c) The debt may be reported to credit bureaus and collection agencies')
      doc.text('   d) Legal action may be taken to recover the debt, including but not limited to court proceedings')
      doc.text('   e) The Borrower may be liable for all legal costs and collection fees incurred')
      doc.moveDown(0.3)
      
      doc.text('4. BLACKLISTING: Persistent non-payment will result in the Borrower being blacklisted from the platform and potentially other financial services.')
      doc.moveDown(0.3)
      
      doc.text('5. LEGAL JURISDICTION: This agreement is governed by the laws of ' + loan.country.name + ' and any disputes will be resolved in the appropriate courts.')
      doc.moveDown(1)

      // Additional terms
      if (loanTerms.additionalTerms) {
        doc.fontSize(14).font('Helvetica-Bold').text('ADDITIONAL TERMS')
        doc.moveDown(0.5)
        doc.fontSize(12).font('Helvetica').text(loanTerms.additionalTerms)
        doc.moveDown(1)
      }

      // Acknowledgment section
      doc.fontSize(14).font('Helvetica-Bold').text('BORROWER ACKNOWLEDGMENT')
      doc.moveDown(0.5)
      
      doc.fontSize(12).font('Helvetica')
      doc.text('By signing this agreement, the Borrower acknowledges that:')
      doc.text('• They have read and understood all terms and conditions')
      doc.text('• They agree to repay the loan according to the specified terms')
      doc.text('• They understand the consequences of default as outlined above')
      doc.text('• They provide accurate personal information and consent to verification')
      doc.text('• They authorize the lender to report their payment history to relevant authorities')
      doc.moveDown(1)

      // Warning box
      doc.rect(50, doc.y, 495, 80).stroke()
      doc.fontSize(10).font('Helvetica-Bold').text('⚠️ WARNING:', 60, doc.y + 10)
      doc.font('Helvetica').text('Failure to repay this loan will result in serious consequences including damage to your credit rating, potential blacklisting from financial services, and possible legal action. Only sign this agreement if you are confident in your ability to repay.', 60, doc.y + 25, { width: 475 })
      doc.moveDown(6)

      // Signature section
      doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURES')
      doc.moveDown(1)

      // Create signature boxes
      doc.fontSize(12).font('Helvetica')
      
      // Lender signature (pre-filled)
      doc.text('LENDER:', 50, doc.y)
      doc.text(`${loan.lender.full_name}`, 50, doc.y + 40)
      doc.text('_____________________', 50, doc.y + 60)
      doc.text('Signature', 50, doc.y + 75)
      doc.text(`Date: ${format(today, 'dd/MM/yyyy')}`, 50, doc.y + 90)

      // Borrower signature (to be filled)
      doc.text('BORROWER:', 300, doc.y - 115)
      doc.text('_____________________', 300, doc.y - 75)
      doc.text('Name (Print)', 300, doc.y - 60)
      doc.text('_____________________', 300, doc.y - 45)
      doc.text('Signature', 300, doc.y - 30)
      doc.text('Date: _______________', 300, doc.y - 15)

      // Footer
      doc.fontSize(8).text(
        `This agreement was generated through Credlio platform on ${format(today, 'dd/MM/yyyy HH:mm')}. Agreement ID: ${loan.id}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}