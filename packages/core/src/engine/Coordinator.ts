import { InputData } from '../types/Header';
import { FrameStream } from '../types/Frame_Stream';

class Coordinator {
  private inputHeader: InputData;
  private frameStream: FrameStream;

  constructor(inputHeader: InputData, frameStream: FrameStream) {
    this.inputHeader = inputHeader;
    this.frameStream = frameStream;
  }
  
}