import React from 'react';
import styles from '../styles/ResultDisplay.module.scss';

const ResultDisplay = ({ results }) => {
  return (
    <div className={styles.container}>
      <h2>Results</h2>
      <a href={results.modifiedResume} download className={styles.downloadLink}>
        Download Modified Resume
      </a>
      <a href={results.coverLetter} download className={styles.downloadLink}>
        Download Cover Letter
      </a>
    </div>
  );
};

export default ResultDisplay;