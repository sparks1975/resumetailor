const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const pdfParse = require('pdf-parse');
const natural = require('natural');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sanitizeText(text) {
  return text.replace(/[^\x00-\x7F]/g, '');
}

// Analyze job description
function analyzeJobDescription(description) {
  const tokenizer = new natural.WordTokenizer();
  const words = tokenizer.tokenize(description.toLowerCase());

  const skills = [
    'JavaScript', 'Python', 'React', 'Node', 'SQL', 'Java', 'TypeScript', 'AWS', 'Docker', 'Git',
    'HTML', 'CSS', 'Angular', 'Vue', 'MongoDB', 'Postgres', 'Linux', 'DevOps', 'Agile',
    'Communication', 'Teamwork', 'Leadership', 'Problem-Solving', 'Project Management', 'Analysis',
    'Adobe Creative Suite', 'Photoshop', 'Illustrator'
  ];
  const matchedSkills = skills.filter(skill => words.includes(skill.toLowerCase()));

  const experienceMatch = description.match(/(\d+\+?\s*years?\s*(?:of)?\s*experience)/i);
  const experience = experienceMatch ? experienceMatch[0] : 'relevant experience';

  return { skills: matchedSkills, experience };
}

// Analyze resume and match to job
function analyzeResume(resumeText, jobAnalysis) {
  const tokenizer = new natural.WordTokenizer();
  const words = tokenizer.tokenize(resumeText.toLowerCase());

  const skills = [
    'JavaScript', 'Python', 'React', 'Node', 'SQL', 'Java', 'TypeScript', 'AWS', 'Docker', 'Git',
    'HTML', 'CSS', 'Angular', 'Vue', 'MongoDB', 'Postgres', 'Linux', 'DevOps', 'Agile',
    'Communication', 'Teamwork', 'Leadership', 'Problem-Solving', 'Project Management', 'Analysis',
    'Adobe Creative Suite', 'Photoshop', 'Illustrator'
  ];
  const resumeSkills = skills.filter(skill => words.includes(skill.toLowerCase()));

  const matchedSkills = resumeSkills.filter(skill => jobAnalysis.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase()));
  const additionalSkills = jobAnalysis.skills.filter(skill => !resumeSkills.map(s => s.toLowerCase()).includes(skill.toLowerCase())).slice(0, 2);

  const experienceMatch = resumeText.match(/(\d+\+?\s*years?\s*(?:of)?\s*experience)/i);
  const resumeExperience = experienceMatch ? experienceMatch[0] : 'relevant experience';

  const emphasis = matchedSkills.length > 0
    ? `Leverage ${resumeExperience} with strong skills in ${matchedSkills.slice(0, 3).join(', ')} to meet job demands`
    : `Adapt ${resumeExperience} to highlight transferable skills for the role`;

  return {
    skills: [...matchedSkills, ...additionalSkills],
    experience: resumeExperience,
    emphasis
  };
}

// Update resume body (original formatting)
function updateResumeBody(resumeText, resumeAnalysis, jobTitle, company) {
  const lines = resumeText.split('\n');
  const tailoredExperience = `Experience: Applied ${resumeAnalysis.experience} to projects aligned with ${jobTitle} at ${company}`;
  const tailoredEmphasis = `Summary: ${resumeAnalysis.emphasis}`;

  const sectionHeaders = {
    skills: ['skills', 'technical skills', 'key skills', 'core competencies', 'skill set', 'SKILLS', 'Skills:', 'Technical Skills:', 'skill summary'],
    experience: ['experience', 'work experience', 'professional experience', 'employment history', 'EXPERIENCE', 'Experience:'],
    summary: ['summary', 'professional summary', 'objective', 'profile', 'SUMMARY', 'Summary:']
  };

  let skillsIndex = -1;
  let experienceIndex = -1;
  let summaryIndex = -1;

  console.log('Searching for sections in resume...');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (skillsIndex === -1 && sectionHeaders.skills.some(header => line.includes(header.toLowerCase()))) {
      skillsIndex = i + 1;
      console.log(`Found Skills section at line ${i}: "${lines[i]}"`);
    }
    if (experienceIndex === -1 && sectionHeaders.experience.some(header => line.includes(header.toLowerCase()))) {
      experienceIndex = i + 1;
      console.log(`Found Experience section at line ${i}: "${lines[i]}"`);
    }
    if (summaryIndex === -1 && sectionHeaders.summary.some(header => line.includes(header.toLowerCase()))) {
      summaryIndex = i + 1;
      console.log(`Found Summary section at line ${i}: "${lines[i]}"`);
    }
  }

  const updatedLines = [...lines];

  if (skillsIndex !== -1) {
    let skillsEndIndex = skillsIndex;
    for (let i = skillsIndex; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();
      if (line === '' || Object.values(sectionHeaders).flat().some(header => line.includes(header.toLowerCase()))) {
        skillsEndIndex = i;
        break;
      }
      if (i === lines.length - 1) skillsEndIndex = i + 1;
    }

    const existingSkillsText = lines.slice(skillsIndex, skillsEndIndex).join('\n');
    const existingSkillsLower = existingSkillsText.toLowerCase();
    const newSkills = resumeAnalysis.skills.filter(skill => !existingSkillsLower.includes(skill.toLowerCase()));

    const isBulletFormat = existingSkillsText.includes('-') || existingSkillsText.includes('•');
    const skillsToAdd = newSkills.length > 0
      ? (isBulletFormat ? newSkills.map(skill => `- ${skill}`).join('\n') : newSkills.join(', '))
      : '';

    if (skillsToAdd) {
      if (isBulletFormat) {
        updatedLines.splice(skillsEndIndex, 0, ...skillsToAdd.split('\n'));
      } else {
        updatedLines[skillsEndIndex - 1] = `${updatedLines[skillsEndIndex - 1]}, ${skillsToAdd}`;
      }
      console.log('Appended new skills to Skills section at index:', skillsEndIndex, 'New skills:', newSkills);
    } else {
      console.log('No new skills to add to Skills section');
    }
  } else {
    console.log('No Skills section found, adding near top');
    updatedLines.splice(2, 0, resumeAnalysis.skills.map(skill => `- ${skill}`).join('\n'));
  }

  if (experienceIndex !== -1) {
    updatedLines.splice(experienceIndex, 0, tailoredExperience);
  } else if (summaryIndex !== -1) {
    updatedLines.splice(summaryIndex, 0, tailoredExperience);
  } else {
    updatedLines.splice(3, 0, tailoredExperience);
  }
  if (summaryIndex !== -1) {
    updatedLines.splice(summaryIndex + (experienceIndex !== -1 ? 1 : 0), 0, tailoredEmphasis);
  } else {
    updatedLines.splice(skillsIndex !== -1 ? skillsIndex + 1 : 4, 0, tailoredEmphasis);
  }

  return sanitizeText(updatedLines.join('\n'));
}

// Reformat resume into a standard style
function reformatResume(resumeText, resumeAnalysis, jobTitle, company) {
  const doc = new PDFDocument({ size: 'LETTER' });
  let buffer = [];
  doc.on('data', chunk => buffer.push(chunk));
  doc.on('end', () => buffer = Buffer.concat(buffer));

  // Extract basic info (assuming name is first line, contact info follows)
  const lines = resumeText.split('\n');
  const name = lines[0].trim() || 'Your Name';
  const contactInfo = lines.slice(1, 3).filter(line => line.trim()).join(' | ') || 'email@example.com | (123) 456-7890';

  // Header
  doc.fontSize(16).text(name, { align: 'center' });
  doc.fontSize(10).text(contactInfo, { align: 'center' });
  doc.moveDown();

  // Professional Summary
  doc.fontSize(12).text('Professional Summary', { underline: true });
  doc.fontSize(10).text(resumeAnalysis.emphasis, { indent: 20 });
  doc.moveDown();

  // Skills
  doc.fontSize(12).text('Skills', { underline: true });
  doc.fontSize(10);
  resumeAnalysis.skills.forEach(skill => {
    doc.text(`- ${skill}`, { indent: 20 });
  });
  doc.moveDown();

  // Experience (basic extraction, could be enhanced)
  doc.fontSize(12).text('Experience', { underline: true });
  doc.fontSize(10).text(`Applied ${resumeAnalysis.experience} to projects aligned with ${jobTitle} at ${company}`, { indent: 20 });
  const experienceSection = lines.findIndex(line => /experience|work experience|professional experience/i.test(line));
  if (experienceSection !== -1) {
    const experienceLines = lines.slice(experienceSection + 1).join('\n');
    doc.text(experienceLines, { indent: 20 });
  }
  doc.moveDown();

  // Education (basic extraction, could be enhanced)
  doc.fontSize(12).text('Education', { underline: true });
  const educationSection = lines.findIndex(line => /education|degree/i.test(line));
  if (educationSection !== -1) {
    const educationLines = lines.slice(educationSection + 1).join('\n');
    doc.fontSize(10).text(educationLines, { indent: 20 });
  } else {
    doc.fontSize(10).text('Relevant education details', { indent: 20 });
  }

  doc.end();
  return new Promise(resolve => doc.on('end', () => resolve(buffer)));
}

app.post('/scrape-job', upload.single('resume'), async (req, res) => {
  console.log('Endpoint hit!');
  const { url, reformat } = req.body;
  const resumeFile = req.file;
  console.log('Received URL:', url, 'Reformat:', reformat);
  console.log('Resume file:', resumeFile);

  if (!url || !url.includes('linkedin.com/jobs') || !resumeFile) {
    console.log('Invalid input provided');
    return res.status(400).json({ error: 'Please provide a valid LinkedIn job URL and resume' });
  }

  try {
    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    console.log('Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('Waiting 5 seconds for dynamic content...');
    await wait(5000);

    const jobData = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText || 'N/A';
      const company = document.querySelector('.topcard__org-name-link')?.innerText || 'N/A';
      const description = document.querySelector('.description__text')?.innerText || 'N/A';
      return { title, company, description };
    });
    console.log('Scraped data:', jobData);
    await browser.close();

    const resumePath = req.file.path;
    const resumeBuffer = fs.readFileSync(resumePath);
    const resumeData = await pdfParse(resumeBuffer);
    let resumeText = resumeData.text;
    console.log('Original resume text:', resumeText.substring(0, 200));

    const jobAnalysis = analyzeJobDescription(jobData.description);
    console.log('Job analysis:', jobAnalysis);
    const resumeAnalysis = analyzeResume(resumeText, jobAnalysis);
    console.log('Resume analysis:', resumeAnalysis);

    let modifiedResumeBytes;
    if (reformat === 'true') {
      // Reformat into standard style, pass jobData.title explicitly
      modifiedResumeBytes = await reformatResume(resumeText, resumeAnalysis, jobData.title, jobData.company);
      console.log('Reformatted resume into standard style');
    } else {
      // Keep original formatting with updates
      const updatedResumeText = updateResumeBody(resumeText, resumeAnalysis, jobData.title, jobData.company);
      const modifiedResumePath = path.join(__dirname, 'uploads', 'modified_resume.pdf');
      const modifiedResumeDoc = new PDFDocument({ size: 'LETTER' });
      const modifiedResumeStream = fs.createWriteStream(modifiedResumePath);
      modifiedResumeDoc.pipe(modifiedResumeStream);
      modifiedResumeDoc.fontSize(12).text(updatedResumeText, 50, 50, { width: 450 });
      modifiedResumeDoc.end();
      await new Promise(resolve => modifiedResumeStream.on('finish', resolve));
      modifiedResumeBytes = fs.readFileSync(modifiedResumePath);
      console.log('Modified resume saved at:', modifiedResumePath, 'Size:', fs.statSync(modifiedResumePath).size);
      fs.unlinkSync(modifiedResumePath);
    }

    const coverLetterPath = path.join(__dirname, 'uploads', 'cover_letter.pdf');
    const coverLetterDoc = new PDFDocument({ size: 'LETTER' });
    const coverLetterStream = fs.createWriteStream(coverLetterPath);
    coverLetterDoc.pipe(coverLetterStream);
    const coverLetterText = sanitizeText(
      `Dear Hiring Manager,\n\n` +
      `I am excited to apply for the ${jobData.title} position at ${jobData.company}. ` +
      `With ${resumeAnalysis.experience}, my experience includes ${resumeAnalysis.skills.slice(0, 3).join(', ')}, ` +
      `which directly supports the requirements of this role. ${resumeAnalysis.emphasis}, ` +
      `and I am eager to apply these strengths to contribute to ${jobData.company}'s success.\n\n` +
      `Attached is my resume, updated to showcase my qualifications aligned with this position. ` +
      `Thank you for your consideration, and I look forward to discussing how I can add value to your team.\n\n` +
      `Sincerely,\n[Your Name]`
    );
    coverLetterDoc.fontSize(12).text(coverLetterText, 50, 50, { width: 450 });
    coverLetterDoc.end();
    await new Promise(resolve => coverLetterStream.on('finish', resolve));
    const coverLetterBytes = fs.readFileSync(coverLetterPath);
    console.log('Cover letter saved at:', coverLetterPath, 'Size:', fs.statSync(coverLetterPath).size);

    res.json({
      jobData,
      modifiedResume: Buffer.from(modifiedResumeBytes).toString('base64'),
      coverLetter: Buffer.from(coverLetterBytes).toString('base64'),
    });

    fs.unlinkSync(resumePath);
    fs.unlinkSync(coverLetterPath);
  } catch (error) {
    console.error('Processing error:', error.message);
    res.status(500).json({ error: 'Failed to process job data or resume', details: error.message });
  }
});

function extractKeywords(description) {
  const words = description.toLowerCase().split(/\W+/);
  const commonSkills = ['javascript', 'python', 'react', 'node', 'sql', 'java', 'communication', 'teamwork'];
  return words.filter(word => commonSkills.includes(word)).slice(0, 5);
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));