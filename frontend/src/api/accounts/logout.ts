import axios from 'axios';
import {Type, type Static} from '@sinclair/typebox';
import handleAPIResponse from '../handle-api-response';

const successType = Type.Object({success: Type.Literal(true)});

export default async function apiLogout(controller?: AbortController) {
  return await handleAPIResponse<Static<typeof successType>>(
    axios.post('/accounts/v1/logout', {
      baseURL: import.meta.env.VITE_API_BASEURL,
      signal: controller?.signal,
    }),
    successType,
  );
}
