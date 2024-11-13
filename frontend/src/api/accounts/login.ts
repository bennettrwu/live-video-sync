import axios from 'axios';
import {Type, type Static} from '@sinclair/typebox';
import handleAPIResponse from '../handle-api-response';

const successType = Type.Object({success: Type.Literal(true)});

export default async function accountAPILogin(username: string, password: string, controller?: AbortController) {
  return await handleAPIResponse<Static<typeof successType>>(
    axios.post(
      '/accounts/v1/login',
      {username, password},
      {
        baseURL: import.meta.env.VITE_API_BASEURL,
        signal: controller?.signal,
      },
    ),
    successType,
  );
}
