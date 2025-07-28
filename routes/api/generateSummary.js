require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { OpenAI } = require('openai');

const API_BASE = 'https://secure.tutorcruncher.com/api';
const API_TOKEN = process.env.TUTORCRUNCHER_API_TOKEN;
const headers = { Authorization: `Token ${API_TOKEN}` };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🧠 AI Email Generator
async function generateEmailFromPrompt(prompt) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful, warm and persuasive tutor agency coordinator writing emails to parents. Be natural and clear.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  return response.choices[0].message.content.trim();
}

// ✏️ Prompt Builder
function buildPrompt({ clientFirstName, consultationCallNotes, jobs }) {
  return `
You are writing an email to a parent named ${clientFirstName} who submitted tutoring requests for their children.

They told us in a consultation call:
"${consultationCallNotes}"

Below are the jobs they've posted and the tutors who applied for each one.

Write a professional, warm, and natural-sounding email that:
- Summarises their original needs
- Organises tutor suggestions by job title
- Explains clearly why each tutor might be a good fit, using the interview notes and cover letters
- Avoids repeating the job title more than once
- Uses a helpful tone (not overly salesy or robotic)

⚠️ Writing style rules:
- Avoid buzzwords (e.g. "align", "excel", "leverage")
- Use a sober tone that’s still polite and warm
- Write in British English spelling only
- Avoid em dashes — use hyphens (-) or rephrase

🧪 Here's an example of the kind of tone and structure we like:

---
Dear Alexa,

I hope this email finds you well and that Amber and Raffety are enjoying their new puppy! Thank you for reaching out to us regarding tutoring support for both your children. We've reviewed your requirements and have a few tutor recommendations that might suit your needs. Let’s go through the options for each child.

For Raffety (Year 2 English, In Person, Putney SW15):

1. Alasdair Linn – Alasdair comes with five years of tutoring experience, ranging from Year 4 to A-Level students. While he’s new to in-person tutoring, his background in engaging with students through creative methods, such as using props or costumes, could be particularly appealing to Raffety, given his interest in animal programmes and gems. Alasdair has an academic background from Oxford, which complements his passion for nurturing a student's confidence and connection.

2. Conor Robinson – Conor is currently a primary teacher with experience in supporting students with comprehension, spelling, and grammar. He uses interactive storytelling and role-play to make learning engaging, which might resonate with Raffety's love for facts and animal programmes. Conor’s structured yet fun approach could help boost Raffety’s confidence in expressing himself.

3. Charlotte Whittle – Although Charlotte primarily tutors older students, she has experience in supporting younger children with their SATs preparation and creative writing. Her compassionate approach, informed by her own experiences, might make her a gentle and understanding guide for Raffety. She's keen on building a supportive learning environment, which could be beneficial for confidence-building.

For Amber (Year 4 Maths, In Person, Putney SW15):

While we currently don't have specific applicants listed for a maths tutor, we are actively searching for someone who can help Amber consolidate her mathematical basics and maintain her confidence. We'll keep you updated with potential candidates soon.

Please let us know if any of these tutors seem like a good fit for Raffety, or if you have any other preferences or questions. We can also arrange for trial sessions before September if you wish to start earlier.

Thank you again for considering our services. We are committed to finding the right support for Amber and Raffety, and we look forward to helping them thrive in their studies.

Warm regards,
---

Now, using the structure above, please draft a personalised email for ${clientFirstName} using the following job and tutor data:

${jobs.map((job, i) => `
Job ${i + 1}: "${job.title}"
${job.description ? `Description: ${job.description}` : ''}

Applicants:
${job.applicants.map((a, j) => `
${j + 1}. ${a.tutorName}
Interview Notes: ${a.interviewNotes}
${a.tenderDescription ? `Cover Letter: ${a.tenderDescription}` : ''}`).join('\n')}
`).join('\n')}
`;
}

// 📥 Fetch helper functions
async function fetchClientConsultationNotes(clientId) {
  const { data } = await axios.get(`${API_BASE}/clients/${clientId}/`, { headers });
  const notes = data.extra_attrs?.find(attr => attr.machine_name === 'consultation_call_notes');
  return {
    first_name: data.first_name,
    notes: notes?.value || ''
  };
}

async function fetchTutorInterviewNotes(tutorId) {
  const { data } = await axios.get(`${API_BASE}/contractors/${tutorId}/`, { headers });
  const notes = data.extra_attrs?.find(attr => attr.machine_name === 'interview_notes');
  return {
    name: `${data.first_name} ${data.last_name}`,
    notes: notes?.value || ''
  };
}

// 🚀 Main route
router.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.write('<html><head><title>Tutor options - Email generator</title></head><body>');
  res.write('<h2>📮 Generating tutor options emails...</h2>');
  res.write('<div id="log" style="font-family: monospace;"></div><hr/><div id="results">');

  function log(msg) {
    res.write(`<div>${msg}</div>`);
  }

  try {
    log('→ Fetching currently available jobs...');
    const servicePages = await axios.get(`${API_BASE}/services/`, { headers });
    const availableServices = servicePages.data.results.filter(s => s.status === 'available');
    log(`🔍 Found ${availableServices.length} available jobs.`);

    const clientJobsMap = new Map();

    for (let i = 0; i < availableServices.length; i++) {
      const service = availableServices[i];
      const label = `[${i + 1}/${availableServices.length}]`;

      const serviceDetail = (await axios.get(`${API_BASE}/services/${service.id}/`, { headers })).data;
      const clientId = serviceDetail.rcrs?.[0]?.paying_client;
      if (!clientId) {
        log(`⚠️ ${label} Skipping "${service.name}" – no paying client.`);
        continue;
      }

      const allTenders = await axios.get(`${API_BASE}/tenders/?service=${service.id}`, { headers });
      const pendingTenders = allTenders.data.results.filter(t => t.status === 'pending');
      if (!pendingTenders.length) {
        log(`⚠️ ${label} Skipping "${service.name}" – no pending applications.`);
        continue;
      }

      log(`📮 ${label} Processing "${service.name}" (${pendingTenders.length} app${pendingTenders.length > 1 ? 's' : ''})`);

      const { first_name: clientFirstName, notes: clientNotes } = await fetchClientConsultationNotes(clientId);

      const applicants = await Promise.all(
        pendingTenders.map(async tender => {
          const tutor = await fetchTutorInterviewNotes(tender.contractor.id);
          return {
            tutorName: tutor.name,
            interviewNotes: tutor.notes,
            tenderDescription: tender.description
          };
        })
      );

      if (!clientJobsMap.has(clientId)) {
        clientJobsMap.set(clientId, {
          clientFirstName,
          consultationCallNotes: clientNotes,
          jobs: []
        });
      }

      clientJobsMap.get(clientId).jobs.push({
        title: service.name,
        description: serviceDetail.description || '',
        applicants
      });
    }

    // Generate one email per client
    for (const [clientId, clientData] of clientJobsMap.entries()) {
      const prompt = buildPrompt({
        clientFirstName: clientData.clientFirstName,
        consultationCallNotes: clientData.consultationCallNotes,
        jobs: clientData.jobs
      });

      const email = await generateEmailFromPrompt(prompt);

      res.write(`
        <div style="border:1px solid #ccc; padding:10px; margin:20px 0;">
          <h3>Client: ${clientData.clientFirstName}</h3>
          <pre style="white-space: pre-wrap;">${email}</pre>
        </div>
      `);
    }

    log(`✅ Done! Generated ${clientJobsMap.size} summary email${clientJobsMap.size > 1 ? 's' : ''}.`);
    res.write('</div></body></html>');
    res.end();
  } catch (err) {
    log(`❌ Error: ${err.message}`);
    res.write('</div></body></html>');
    res.end();
  }
});

module.exports = router;
