import { memo } from 'react';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default memo(StatusBadge);
