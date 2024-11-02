export type JSONObject = {
  [key: string]:
    | null
    | string
    | number
    | boolean
    | JSONObject
    | Array<JSONObject>;
};
