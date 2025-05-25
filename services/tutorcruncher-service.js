const axios = require('axios');

const BASE_URL = process.env.BASE_URL; // should be https://secure.tutorcruncher.com/api
const TOKEN = process.env.TUTORCRUNCHER_API_TOKEN;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAllPages(path) {
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
