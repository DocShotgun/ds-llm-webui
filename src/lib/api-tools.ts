"use server";

export async function get_model_params(api_url: string, api_key: string = "") {
  const r = await fetch(api_url + "/v1/model", {
    method: "GET",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
      authorization: api_key,
      "x-api-key": api_key,
    },
  });
  if (r.status != 200) {
    throw new Error(
      "Checking model parameters failed. Check your API URL and key."
    );
  }
  const responseData = await r.json();
  return responseData.parameters;
}
