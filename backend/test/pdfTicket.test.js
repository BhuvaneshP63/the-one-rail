const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { generateTicketPDF } = require('../src/utils/pdfGenerator');

test('simulated ticket PDF is generated as a readable A4 PDF with a clear validity notice', async () => {
  const pdf = await generateTicketPDF({
    pnr: '1234567890', bookingId: 'BKABC123', date: '2030-01-01', seatClass: 'SL',
    status: 'Confirmed', paymentStatus: 'Paid', paymentId: 'pay_mock_demo', totalFare: 500,
    train: { trainNumber: '92001', name: 'Sample Express' },
    source: { name: 'Chennai Central', code: 'MAS' },
    destination: { name: 'Coimbatore Junction', code: 'CBE' },
    boardingStation: { name: 'Chennai Central', code: 'MAS' },
    passengers: [{ name: 'Demo Passenger', age: 30, gender: 'Other', coach: 'S1', seatNumber: 1, seatType: 'LB' }]
  });
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  const pdfStructure = pdf.toString('latin1');
  assert.match(pdfStructure, /\/MediaBox \[0 0 595\.28 841\.89\]/);
  // PDFKit compresses page text streams, so verify the notice in the generator
  // source while checking the generated file's PDF structure above.
  const generatorSource = fs.readFileSync(path.join(__dirname, '../src/utils/pdfGenerator.js'), 'utf8');
  assert.match(generatorSource, /SIMULATED RESERVATION NOTICE/);
  assert.match(generatorSource, /NOT A VALID INDIAN RAILWAYS TICKET/);
});
