import type { APIInteractionResponse } from 'discord-api-types/v10';

export interface AttachmentFile {
  filename: string;
  data: Uint8Array;
  contentType?: string;
}

export interface HandlerResult {
  response: APIInteractionResponse;
  files?: AttachmentFile[];
}

// Discord accepts either a plain JSON body or multipart/form-data (for responses
// that include file attachments) as the direct interaction response.
export function toHttpResponse({ response, files }: HandlerResult): Response {
  if (!files || files.length === 0) {
    return Response.json(response);
  }

  const attachments = files.map((file, id) => ({ id, filename: file.filename }));
  const existingData = 'data' in response ? response.data : undefined;
  const payload = {
    ...response,
    data: {
      ...(existingData ?? {}),
      attachments,
    },
  };

  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  files.forEach((file, index) => {
    form.append(`files[${index}]`, new Blob([file.data], { type: file.contentType ?? 'image/png' }), file.filename);
  });

  return new Response(form);
}
