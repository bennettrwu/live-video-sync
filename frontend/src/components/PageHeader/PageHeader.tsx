import {useMediaQuery} from '@mantine/hooks';
import {em} from '@mantine/core';

import ThemeSelector from '../ThemeSelector/ThemeSelector';
import './PageHeader.scss';

export default function PageHeader() {
  const isMobile = useMediaQuery(`(max-width: ${em(750)})`);

  return (
    <div className="nav-container">
      <div className="nav-left">
        <h3>Live Video Sync</h3>
      </div>

      <div className="nav-right">
        <ThemeSelector showText={!isMobile} />
      </div>
    </div>
  );
}
