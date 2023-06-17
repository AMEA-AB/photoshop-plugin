import os from 'os';
import { versions } from "uxp";
import React from "react";
import Spectrum from 'react-uxp-spectrum';
import "./About.css";

interface Props {
  dialog: HTMLDialogElement;
  [key: string]: any;
}

export const About = (props: Props) => {
  return (
    <form method="dialog" className="aboutDialog">
      <Spectrum.Heading>AMEA Plugin</Spectrum.Heading>
      <Spectrum.Divider size="large"></Spectrum.Divider>
      <Spectrum.Body>
        This plugin was made to help the AMEA team with their workflow.
        It can automatically generate images for the UV printer based
        on templates and a excel file containing the data.
      </Spectrum.Body>
      <Spectrum.Detail>VERSIONS</Spectrum.Detail>
      <div className="table">
        <div>
          <Spectrum.Detail>PLUGIN: </Spectrum.Detail>
          <Spectrum.Body> {versions.plugin}</Spectrum.Body>
        </div>
        <div>
          <Spectrum.Detail>OPERATING SYTEM:</Spectrum.Detail>
          <Spectrum.Body>
            {os.platform()} {os.release()}
          </Spectrum.Body>
        </div>
        <div>
          <Spectrum.Detail>UNIFIED EXTENSIBILITY PLATFORM:</Spectrum.Detail>
          <Spectrum.Body>{versions.uxp}</Spectrum.Body>
        </div>
      </div>
      <Spectrum.Button
        variant="primary"
        onClick={() => props.dialog.close("ok")}
      >
        OK
      </Spectrum.Button>
    </form>
  );
};