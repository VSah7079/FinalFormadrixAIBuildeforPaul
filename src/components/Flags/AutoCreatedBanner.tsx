import React from "react";
import '../../pathscribe.css';
import { FlagDefinition } from "../../types/FlagDefinition";

interface Props {
  flags: FlagDefinition[];
}

const AutoCreatedBanner: React.FC<Props> = ({ flags }) => {
  const codes = flags.map(f => f.lisCode).join(", ");

  return (
    <div className="banner-warning">
      <strong>New LIS Flags Detected:</strong> {codes}
      <div>These flags were automatically created from LIS codes. Review and update as needed.</div>
    </div>
  );
};

export default AutoCreatedBanner;
