import {RawData} from 'ws';
import {InvalidJsonMessage} from '../errors/messageParsing';
import {JSONObject} from '../types/JSONObject';

export function parseJSONMessage(data: RawData, isBinary = false): JSONObject {
  if (isBinary) throw new InvalidJsonMessage('Message was binary');

  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (e) {
    throw new InvalidJsonMessage('Message was not valid JSON');
  }
  return message;
}
