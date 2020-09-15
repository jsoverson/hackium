export enum HACKIUM_EVENTS {
  BEFORE_LAUNCH = 'beforeLaunch',
  LAUNCH = 'launch',
}

export class HackiumClientEvent {
  name: string;
  payload: any;
  constructor(name: string, payload: any) {
    this.name = name;
    this.payload = payload;
  }
}
