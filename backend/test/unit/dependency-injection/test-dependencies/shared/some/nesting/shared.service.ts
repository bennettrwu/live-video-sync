import type {TestDependencies} from '../../../../create-dependency-container.test.js';

export default class SharedService {
  private _id: string;
  constructor(
    scopedCounter: TestDependencies['scopedCounter'],
    private disposeSpy: TestDependencies['disposeSpy'],
  ) {
    this._id = `sharedService - ${scopedCounter()}`;
  }

  getId() {
    return this._id;
  }
}
