const axios = require('axios');

const BASE_URL = process.env.BASE_URL; // should be https://secure.tutorcruncher.com/api
const TOKEN = process.env.TUTORCRUNCHER_API_TOKEN;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllPages(path) {
  // Special logic for appointments: fetch all IDs, then fetch each instance
  if (path === '/appointments/' || path === 'appointments/') {
    let results = [];
    let url = path;

    // 1. Fetch all appointment summaries (paginated)
    while (url) {
      const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      console.log(`→ Fetching: ${fullUrl}`);

      try {
        const response = await axios.get(fullUrl, {
          headers: { Authorization: `Token ${TOKEN}` }
        });

        if (!Array.isArray(response.data.results)) {
          console.warn(`⚠️ Unexpected response format for ${fullUrl}`);
          break;
        }

        results = results.concat(response.data.results);
        await delay(500);
        url = response.data.next; // next is a full URL
      } catch (error) {
        console.error(`❌ TutorCruncher API request failed for ${fullUrl}`);
        console.error(error.response?.data || error.message);
        throw error;
      }
    }

    // 2. For each summary, fetch the full instance
    const fullAppointments = [];
    for (const summary of results) {
      const id = summary.id;
      if (!id) continue;
      const instanceUrl = `${BASE_URL}/appointments/${id}/`;
      console.log(`→ Fetching full appointment: ${instanceUrl}`);

      let attempts = 0;
      let success = false;
      while (!success && attempts < 5) {
        try {
          const instanceRes = await axios.get(instanceUrl, {
            headers: { Authorization: `Token ${TOKEN}` }
          });
          fullAppointments.push(instanceRes.data);
          success = true;
        } catch (err) {
          attempts++;
          const isRateLimit = err.response?.status === 429;
          const isConnReset = err.code === 'ECONNRESET';
          if (isRateLimit || isConnReset) {
            const wait = 2000 * attempts; // Exponential backoff
            console.warn(
              `⚠️ ${isRateLimit ? '429 rate limit' : 'ECONNRESET'} for id ${id}, waiting ${wait}ms before retrying (attempt ${attempts})...`
            );
            await delay(wait);
          } else {
            console.warn(`⚠️ Failed to fetch appointment instance for id ${id}:`, err.message);
            break; // Don't retry for other errors
          }
        }
      }
      await delay(700); // Slightly longer delay for stability
    }
    return fullAppointments;
  }

  // Special logic for clients: fetch all IDs, then fetch each instance
  if (path === '/clients/' || path === 'clients/') {
    let results = [];
    let url = path;

    // 1. Fetch all client summaries (paginated)
    while (url) {
      const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      console.log(`→ Fetching: ${fullUrl}`);

      try {
        const response = await axios.get(fullUrl, {
          headers: { Authorization: `Token ${TOKEN}` }
        });

        if (!Array.isArray(response.data.results)) {
          console.warn(`⚠️ Unexpected response format for ${fullUrl}`);
          break;
        }

        results = results.concat(response.data.results);
        await delay(500);
        url = response.data.next; // next is a full URL
      } catch (error) {
        console.error(`❌ TutorCruncher API request failed for ${fullUrl}`);
        console.error(error.response?.data || error.message);
        throw error;
      }
    }

    // 2. For each summary, fetch the full instance
    const fullClients = [];
    for (const summary of results) {
      const id = summary.id;
      if (!id) continue;
      const instanceUrl = `${BASE_URL}/clients/${id}/`;
      console.log(`→ Fetching full client: ${instanceUrl}`);

      let attempts = 0;
      let success = false;
      while (!success && attempts < 5) {
        try {
          const instanceRes = await axios.get(instanceUrl, {
            headers: { Authorization: `Token ${TOKEN}` }
          });
          fullClients.push(instanceRes.data);
          success = true;
        } catch (err) {
          attempts++;
          const isRateLimit = err.response?.status === 429;
          const isConnReset = err.code === 'ECONNRESET';
          if (isRateLimit || isConnReset) {
            const wait = 2000 * attempts; // Exponential backoff
            console.warn(
              `⚠️ ${isRateLimit ? '429 rate limit' : 'ECONNRESET'} for id ${id}, waiting ${wait}ms before retrying (attempt ${attempts})...`
            );
            await delay(wait);
          } else {
            console.warn(`⚠️ Failed to fetch client instance for id ${id}:`, err.message);
            break; // Don't retry for other errors
          }
        }
      }
      await delay(700); // Slightly longer delay for stability
    }
    return fullClients;
  }  

  // Default: fetch all pages for other endpoints
  let results = [];
  let url = path;

  while (url) {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    console.log(`→ Fetching: ${fullUrl}`);

    try {
      const response = await axios.get(fullUrl, {
        headers: { Authorization: `Token ${TOKEN}` }
      });

      if (!Array.isArray(response.data.results)) {
        console.warn(`⚠️ Unexpected response format for ${fullUrl}`);
        break;
      }

      results = results.concat(response.data.results);
      await delay(500);
      url = response.data.next; // next is a full URL
    } catch (error) {
      console.error(`❌ TutorCruncher API request failed for ${fullUrl}`);
      console.error(error.response?.data || error.message);
      throw error;
    }
  }

  return results;
}

module.exports = {
  fetchAllPages
};