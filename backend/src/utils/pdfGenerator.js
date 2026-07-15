const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generates a PDF ticket in memory as a Buffer.
 * @param {Object} booking - Booking mongoose document populated with train, source, destination, boardingStation, user
 * @returns {Promise<Buffer>} - Resolves to the PDF buffer
 */
const generateTicketPDF = async (booking) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Generate QR Code data
      const qrPayload = JSON.stringify({
        pnr: booking.pnr,
        bookingId: booking.bookingId,
        train: booking.train.trainNumber,
        date: booking.date,
        passengersCount: booking.passengers.length
      });
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

      // Title & Branding Header
      doc.fillColor('#C51E3A')
         .rect(0, 0, 595.28, 80) // Header band
         .fill();

      doc.fillColor('#FFFFFF')
         .fontSize(22)
         .text('INDIAN RAILWAYS E-TICKET', 40, 28, { characterSpacing: 1 });
      
      doc.fontSize(10)
         .text('NATIONAL PASSENGER RESERVATION SYSTEM', 40, 54, { characterSpacing: 0.5 });

      // Reset text color to dark gray for body
      doc.fillColor('#333333');

      // PNR and Booking ID Bar
      doc.rect(40, 95, 515, 35)
         .fillColor('#F5F5F7')
         .fill()
         .stroke();

      doc.fillColor('#333333')
         .fontSize(11)
         .text(`PNR Number: `, 55, 107, { continued: true })
         .font('Helvetica-Bold')
         .fillColor('#C51E3A')
         .text(booking.pnr, { continued: true })
         .font('Helvetica')
         .fillColor('#333333')
         .text(`     |     Booking ID: `, { continued: true })
         .font('Helvetica-Bold')
         .text(booking.bookingId);

      // Journey Details Card
      doc.font('Helvetica-Bold')
         .fontSize(13)
         .fillColor('#C51E3A')
         .text('JOURNEY DETAILS', 40, 150);
      
      doc.strokeColor('#E5E7EB')
         .lineWidth(1)
         .moveTo(40, 167)
         .lineTo(555, 167)
         .stroke();

      doc.fillColor('#333333')
         .font('Helvetica')
         .fontSize(10);

      // Column 1
      doc.text('Train Number & Name:', 40, 180)
         .font('Helvetica-Bold')
         .text(`${booking.train.trainNumber} / ${booking.train.name}`, 40, 195)
         .font('Helvetica')
         .text('Class of Travel:', 40, 220)
         .font('Helvetica-Bold')
         .text(`${booking.seatClass} (AC / Sleeper)`, 40, 235)
         .font('Helvetica')
         .text('Date of Journey:', 40, 260)
         .font('Helvetica-Bold')
         .text(`${booking.date}`, 40, 275);

      // Column 2 (Middle)
      doc.font('Helvetica')
         .text('From Station:', 220, 180)
         .font('Helvetica-Bold')
         .text(`${booking.source.name} (${booking.source.code})`, 220, 195)
         .font('Helvetica')
         .text('To Station:', 220, 220)
         .font('Helvetica-Bold')
         .text(`${booking.destination.name} (${booking.destination.code})`, 220, 235)
         .font('Helvetica')
         .text('Boarding Station:', 220, 260)
         .font('Helvetica-Bold')
         .text(`${booking.boardingStation.name} (${booking.boardingStation.code})`, 220, 275);

      // Embedded QR Code
      doc.image(qrCodeDataUrl, 440, 175, { width: 110, height: 110 });

      // Passenger Details Table
      doc.font('Helvetica-Bold')
         .fontSize(13)
         .fillColor('#C51E3A')
         .text('PASSENGER DETAILS', 40, 315);
      
      doc.strokeColor('#E5E7EB')
         .lineWidth(1)
         .moveTo(40, 332)
         .lineTo(555, 332)
         .stroke();

      // Table Header
      let y = 342;
      doc.fillColor('#C51E3A')
         .rect(40, y, 515, 20)
         .fill();

      doc.fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('S.No.', 50, y + 6)
         .text('Passenger Name', 90, y + 6)
         .text('Age', 260, y + 6)
         .text('Gender', 310, y + 6)
         .text('Status', 370, y + 6)
         .text('Coach/Seat No.', 440, y + 6);

      y += 20;

      // Table Rows
      booking.passengers.forEach((p, idx) => {
        // Draw row background for alternating lines
        if (idx % 2 === 0) {
          doc.fillColor('#F9FAFB')
             .rect(40, y, 515, 24)
             .fill();
        }

        doc.fillColor('#333333')
           .font('Helvetica')
           .fontSize(9)
           .text(`${idx + 1}`, 50, y + 8)
           .font('Helvetica-Bold')
           .text(p.name, 90, y + 8)
           .font('Helvetica')
           .text(`${p.age}`, 260, y + 8)
           .text(p.gender, 310, y + 8)
           .fillColor('#10B981') // Green for Confirmed
           .font('Helvetica-Bold')
           .text(booking.status === 'Cancelled' ? 'CANCELLED' : 'CONFIRMED (CNF)', 370, y + 8)
           .fillColor('#333333')
           .text(`${p.coach} / ${p.seatNumber} (${p.seatType})`, 440, y + 8);

        y += 24;
      });

      // Fare details
      y += 20;
      doc.rect(40, y, 515, 60)
         .fillColor('#F5F5F7')
         .fill()
         .strokeColor('#E5E7EB')
         .stroke();

      doc.fillColor('#333333')
         .font('Helvetica')
         .fontSize(10)
         .text('Transaction ID:', 55, y + 15)
         .font('Helvetica-Bold')
         .text(booking.paymentId || 'MOCK_TXN_REFUNDED', 55, y + 32)
         .font('Helvetica')
         .text('Payment Status:', 240, y + 15)
         .font('Helvetica-Bold')
         .text(booking.paymentStatus, 240, y + 32)
         .font('Helvetica')
         .text('Total Fare Paid (incl. taxes):', 400, y + 15)
         .font('Helvetica-Bold')
         .fillColor('#C51E3A')
         .fontSize(13)
         .text(`Rs. ${booking.totalFare.toFixed(2)}`, 400, y + 30);

      // Terms & Conditions
      y += 85;
      doc.fillColor('#666666')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text('IMPORTANT TERMS & CONDITIONS', 40, y)
         .font('Helvetica')
         .fontSize(7.5)
         .text('1. Please carry a valid original Identity Proof (Aadhaar, Passport, Driving License, PAN card) along with this e-ticket during the journey.', 40, y + 18, { width: 515 })
         .text('2. Only confirmed ticket passengers are authorized to board the reserved coaches.', 40, y + 30, { width: 515 })
         .text('3. Cancellation can be processed online prior to train chart preparation. Refund will be automatically credited to the original payment source.', 40, y + 42, { width: 515 })
         .text('4. In case of train cancellation by railways, full refund will be processed automatically.', 40, y + 54, { width: 515 });

      // Footer
      doc.fontSize(8)
         .fillColor('#999999')
         .text('Generated via Rail Yatra Booking System. Thank you for traveling with Indian Railways.', 40, 760, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateTicketPDF };

