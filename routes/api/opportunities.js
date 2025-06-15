const express = require('express');
const router = express.Router();
const Service = require('../../models/Service');

router.get('/', async (req, res) => {
  try {
    const services = await Service.find({
      status: 'available'
    }).sort({ createdAt: -1 });

    const html = renderOpportunitiesEmail(services);
    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong');
  }
});

function renderOpportunitiesEmail(services) {
  const intro = `
    <p>Hi Jack,</p>
    <p>We have <strong>${services.length} opportunities</strong> to fill.</p>
    <p>If you're interested, please make an application on TutorCruncher <a href="https://secure.tutorcruncher.com/cal/con/service/" target="_blank">here</a> and we'll get back to you as soon as possible. Please specify your availability when you apply for a role as without this we won't be able to connect you with clients successfully.</p>
    <hr style="margin: 24px 0;" />
  `;

  const jobs = services.map(svc => {
    const name = svc.name.replace(/^\[[^\]]+\]\s*/, ''); // strip [XX] codes
    const rate = svc.dft_contractor_rate;
    return `<p>${name} – £${rate}/hr</p>`;
  }).join('\n');

  const outro = `
    <hr style="margin: 24px 0;" />
    <p>If you have a pending application with us, we’ll get back to you ASAP.</p>
    <p>Questions? Contact us at <a href="mailto:info@londontuitiongroup.co.uk">info@londontuitiongroup.co.uk</a>.</p>
    <p>Best wishes,<br/>The London Tuition Group team</p>
    <p><a href="https://tutorcruncher-public.s3.amazonaws.com/putney-tutors/LondonTuitionGroup_TutorTermsAndConditions.pdf">T&Cs</a> | <a href="https://tutorcruncher-public.s3.amazonaws.com/putney-tutors/TutorHandbook_LTG.pdf">Tutor Handbook</a></p>
  `;

  return intro + jobs + outro;
}


module.exports = router;
