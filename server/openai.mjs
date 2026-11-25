const endpoint = 'https://api.openai.com/v1';

export async function askOpenAI(key, request, instructions) {
  const { mode, message, history, photos } = request;
  let path = '/responses';
  let body;
  if (mode === 'chat') {
    body = JSON.stringify({
      model: 'gpt-6-luna',
      store: false,
      reasoning: { effort: 'none' },
      max_output_tokens: 650,
      instructions,
      input: [...history, {
        role: 'user',
        content: [
          { type: 'input_text', text: message },
          ...photos.map(url => ({ type: 'input_image', image_url: url, detail: 'low' }))
        ]
      }]
    });
  } else {
    const fields = {
      model: 'gpt-image-2.6-flare',
      prompt: message,
      n: 1,
      size: '1024x1024',
      quality: 'low',
      complexity: 'low',
      output_format: 'jpeg'
    };
    path = '/images/generations';
    body = JSON.stringify(fields);
    if (photos.length) {
      path = '/images/edits';
      body = new FormData();
      for (const [name, value] of Object.entries(fields)) body.append(name, String(value));
      photos.forEach((photo, index) => {
        const bytes = Buffer.from(photo.split(',')[1], 'base64');
        body.append('image[]', new Blob([bytes], { type: 'image/jpeg' }), `eser-${index}.jpg`);
      });
    }
  }
  const headers = { Authorization: `Bearer ${key}` };
  if (typeof body === 'string') headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint + path, {
    method: 'POST', headers, body, signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) {
    console.error('OpenAI HTTP', response.status, response.headers.get('x-request-id'));
    throw new Error('OpenAI request failed');
  }
  const result = await response.json();
  if (mode === 'image' && result.data?.[0]?.b64_json) {
    return { image: 'data:image/jpeg;base64,' + result.data[0].b64_json };
  }
  const text = result.output?.flatMap(item => item.content ?? [])
    .map(part => part.text ?? part.refusal ?? '').filter(Boolean).join('\n').trim();
  if (!text) throw new Error('Empty response');
  return { text };
}
