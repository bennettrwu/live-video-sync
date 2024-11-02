import {InvalidSyncMessage} from '../errors/messageParsing';
import {JSONObject} from '../types/JSONObject';

export type ClientSyncState = {
  paused: boolean;
  time: number;
  mediaIndex: number;
};

export type ServerSyncState = {
  syncTime: number;
} & ClientSyncState;

export type ServerSyncMessage =
  | ({type: 'state'; uuid: string} & ServerSyncState)
  | {type: 'ready'; uuid: string}
  | {type: 'unready'; uuid: string}
  | {type: 'join'; uuid: string}
  | {type: 'leave'; uuid: string};

export type ClientSyncMessage =
  | ({type: 'state'} & ClientSyncState)
  | {type: 'ready'}
  | {type: 'unready'}
  | {type: 'join'}
  | {type: 'leave'};

export function parseClientSyncMessage(
  jsonObject: JSONObject
): ClientSyncMessage {
  if (jsonObject.type === 'ready') return {type: 'ready'};
  if (jsonObject.type === 'unready') return {type: 'unready'};
  if (jsonObject.type === 'join') return {type: 'join'};
  if (jsonObject.type === 'leave') return {type: 'leave'};
  if (jsonObject.type !== 'state') {
    throw new InvalidSyncMessage('Message has missing or invalid type field');
  }

  if (typeof jsonObject.paused !== 'boolean') {
    throw new InvalidSyncMessage('Message has missing or invalid paused field');
  }

  if (typeof jsonObject.time !== 'number') {
    throw new InvalidSyncMessage('Message has missing or invalid time field');
  }

  if (typeof jsonObject.mediaIndex !== 'number') {
    throw new InvalidSyncMessage(
      'Message has missing or invalid mediaIndex field'
    );
  }

  const {paused, time, mediaIndex} = jsonObject;
  return {type: 'state', paused, time, mediaIndex};
}

export function parseServerSyncMessage(
  jsonObject: JSONObject
): ServerSyncMessage {
  if (typeof jsonObject.uuid !== 'string') {
    throw new InvalidSyncMessage('Message has missing or invalid uuid field');
  }
  const {uuid} = jsonObject;

  if (jsonObject.type === 'ready') return {type: 'ready', uuid};
  if (jsonObject.type === 'unready') return {type: 'unready', uuid};
  if (jsonObject.type === 'join') return {type: 'join', uuid};
  if (jsonObject.type === 'leave') return {type: 'leave', uuid};

  if (jsonObject.type !== 'state') {
    throw new InvalidSyncMessage('Message has missing or invalid type field');
  }

  if (typeof jsonObject.paused !== 'boolean') {
    throw new InvalidSyncMessage('Message has missing or invalid paused field');
  }

  if (typeof jsonObject.time !== 'number') {
    throw new InvalidSyncMessage('Message has missing or invalid time field');
  }

  if (typeof jsonObject.syncTime !== 'number') {
    throw new InvalidSyncMessage(
      'Message has missing or invalid syncTime field'
    );
  }

  if (typeof jsonObject.mediaIndex !== 'number') {
    throw new InvalidSyncMessage(
      'Message has missing or invalid mediaIndex field'
    );
  }

  const {paused, time, syncTime, mediaIndex} = jsonObject;
  return {type: 'state', paused, time, syncTime, mediaIndex, uuid};
}
