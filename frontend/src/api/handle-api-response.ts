import {Type, type Static, type TObject} from '@sinclair/typebox';
import {Value} from '@sinclair/typebox/value';
import {AxiosResponse} from 'axios';
import axios from 'axios';

const failResponse = Type.Object({
  success: Type.Literal(false),
  statusCode: Type.Union([
    Type.Literal(401),
    Type.Literal(402),
    Type.Literal(403),
    Type.Literal(404),
    Type.Literal(500),
  ]),
  message: Type.String(),
  requestId: Type.String(),
});
export type FailType = Static<typeof failResponse>;

const invalidResponse = Type.Object({
  success: Type.Literal(false),
  statusCode: Type.Literal(400),
  requestErrors: Type.Array(
    Type.Object({
      message: Type.String(),
      key: Type.String(),
    }),
  ),
  requestId: Type.String(),
});
export type InvalidType = Static<typeof invalidResponse>;

/**
 * Checks axios response against given successful API response format
 * If successful, returns response with format matching given successType
 * Otherwise, if response fails to match with successType or returns an error code, returns failResponse or invalidResponse
 * If request is cancelled, return undefined
 * @param apiRequest
 * @param successType
 * @returns type checked response
 */
export default async function handleAPIResponse<S>(
  apiRequest: Promise<AxiosResponse<unknown, unknown>>,
  successType: TObject,
): Promise<S | FailType | InvalidType | undefined> {
  try {
    const response = await apiRequest;
    Value.Assert(successType, response.data);
    return response.data as S;
  } catch (error) {
    if (axios.isCancel(error)) return undefined;

    try {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          Value.Assert(invalidResponse, error.response.data);
          return error.response.data as InvalidType;
        }

        Value.Assert(failResponse, error.response?.data);
        return error.response.data as FailType;
      }
    } catch {
      // Fall through if this fails
    }
  }

  return {
    success: false,
    statusCode: 500,
    message: 'Our servers returned an invalid response. We are working to fix the issue. Please try again later.',
    requestId: 'unknown',
  };
}
