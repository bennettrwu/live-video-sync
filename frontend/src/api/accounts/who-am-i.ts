import axios from 'axios';
import {Type, type Static} from '@sinclair/typebox';
import handleAPIResponse from '../handle-api-response';

const successType = Type.Object({success: Type.Literal(true), username: Type.String()});

export default async function apiWhoAmI(controller?: AbortController) {
  return await handleAPIResponse<Static<typeof successType>>(
    axios.get('/accounts/v1/who-am-i', {
      baseURL: import.meta.env.VITE_API_BASEURL,
      signal: controller?.signal,
    }),
    successType,
  );
}
