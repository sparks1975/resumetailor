import React from 'react';
import styles from '../styles/JobInput.module.scss';

const JobInput = ({ jobUrl, setJobUrl }) => {
  return (
    <div className={styles.container}>
      <label htmlFor="jobUrl">LinkedIn Job URL</label>
      <input
        type="url"
        id="jobUrl"
        value={jobUrl}
        onChange={(e) => setJobUrl(e.target.value)}
        placeholder="Paste LinkedIn job URL here"
        className={styles.input}
      />
    </div>
  );
};

export default JobInput;