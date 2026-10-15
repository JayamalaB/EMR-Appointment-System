import { memo } from 'react';
import Button from './Button';

/**
 * Memoized because it's rendered inside list pages that re-render often
 * (every filter keystroke) while the pagination controls themselves only
 * need to change when the page/total actually changes.
 */
function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="pagination">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}

export default memo(Pagination);
