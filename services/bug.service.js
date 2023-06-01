const PDFDocument = require('pdfkit')
const fs = require('fs');
var bugs = require('../data/bugs.json')

const PAGE_SIZE = 10



module.exports = {
  query,
  get,
  remove,
  save,
  createPDF
}

function query(filterBy) {
  let filteredBugs = bugs
  let totalPages = 0

  if (filterBy.txt) {
    const regex = new RegExp(filterBy.txt, 'i')
    filteredBugs = filteredBugs.filter(bug => {
      return regex.test(bug.title.toLowerCase()) || regex.test(bug.description.toLowerCase())
    })
  }
  if (filterBy.severity) {
    filteredBugs = filteredBugs.filter(bug => {
      return +bug.severity >= +filterBy.severity
    })
  }
  if (filterBy.pageIdx !== undefined) {
    totalPages = Math.ceil(filteredBugs.length / PAGE_SIZE)
    const startIdx = filterBy.pageIdx * PAGE_SIZE - PAGE_SIZE
    filteredBugs = filteredBugs.slice(startIdx, PAGE_SIZE + startIdx)
    return Promise.resolve({ filteredBugs, totalPages })
  }
  return Promise.resolve({ filteredBugs, totalPages })
}

function get(bugId) {
  const bug = bugs.find(bug => bug._id === bugId)
  return Promise.resolve(bug)
}

function remove(bugId) {
  bugs = bugs.filter(bug => bug._id !== bugId)

  return _writebugsToFile()
}

function save(bug) {
  if (bug._id) {
    const bugToUpdate = bugs.find(currBug => currBug._id === bug._id)
    bugToUpdate.title = bug.title
    bugToUpdate.description = bug.description
    bugToUpdate.severity = bug.severity
    return _writebugsToFile().then(() => bugToUpdate)
  } else {
    bug._id = _makeId()
    bug.createdAt = Date.now()
    bugs.push(bug)
    return _writebugsToFile().then(() => bug)
  }
}

function _makeId(length = 5) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function _writebugsToFile() {
  return new Promise((res, rej) => {
    const data = JSON.stringify(bugs, null, 2)
    fs.writeFile('data/bugs.json', data, (err) => {
      if (err) return rej(err)
      // console.log("File written successfully\n");
      res()
    });
  })
}

function createPDF(res) {
  console.log('createPDF function')
  const doc = new PDFDocument()

  // Set the appropriate content headers 
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="output-t.pdf"')

  // Pipe the PDF document directly to the response
  doc.pipe(res);

  // Add your PDF content here
  doc.image('public/assets/img/bugs-pic.png', {
    fit: [250, 300], align: 'center',
  }).font('Times-Bold').fontSize(20).text('Bugs-tracker').moveDown(1.5)
  doc


  bugs.forEach((bug, idx) => {
    doc.font('Times-Bold').fontSize(16).text(`${idx + 1}. ${bug.title}:`)
    doc.font('Times-Roman').fontSize(12).text(`${bug.description}. Severity of bug: ${bug.severity}`).moveDown(1.5)
  });

  doc.end((err) => {
    if (err) {
      console.log('Error while generating PDF:', err)
    } else {
      console.log('PDF generation completed')
    }
  });
}
