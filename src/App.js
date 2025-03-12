import React, { useState } from 'react';
import axios from 'axios';
import styles from './styles/App.module.scss';
import JobInput from './components/JobInput';
import ResumeUpload from './components/ResumeUpload';
import ResultDisplay from './components/ResultDisplay';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function App() {
  const [jobUrl, setJobUrl] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [results, setResults] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reformatResume, setReformatResume] = useState(false);

  const handleProcess = async () => {
    if (!jobUrl || !resumeFile) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('url', jobUrl);
      formData.append('resume', resumeFile);
      formData.append('reformat', reformatResume);

      console.log('Sending request to backend with URL:', jobUrl, 'Reformat:', reformatResume);
      const response = await axios.post(`${API_BASE_URL}/scrape-job`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Response received:', response.data);

      setJobData(response.data.jobData);
      setResults({
        modifiedResume: `data:application/pdf;base64,${response.data.modifiedResume}`,
        coverLetter: `data:application/pdf;base64,${response.data.coverLetter}`,
      });
    } catch (error) {
      console.error('Axios error:', error.message, error.code, error.response?.data036);
      alert(`Failed to process: ${error.message}${error.response?.data?.details ? ' - ' + error.response.data.details : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>LinkedIn Resume Tailor</h1>
      <div className={styles.container}>
        <JobInput jobUrl={jobUrl} setJobUrl={setJobUrl} />
        <ResumeUpload setResumeFile={setResumeFile} />
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={reformatResume}
            onChange={(e) => setReformatResume(e.target.checked)}
            disabled={isLoading}
          />
          Reformat resume to standard style
        </label>
        <button
          className={styles.processButton}
          onClick={handleProcess}
          disabled={!jobUrl || !resumeFile || isLoading}
        >
          {isLoading ? 'Processing...' : 'Process'}
        </button>

        {isLoading && (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
            <p>Processing your resume...</p>
          </div>
        )}

        {jobData && !isLoading && (
          <div className={styles.jobData}>
            <h2>Scraped Job Data</h2>
            <p><strong>Title:</strong> {jobData.title}</p>
            <p><strong>Company:</strong> {jobData.company}</p>
            <p><strong>Description:</strong> {jobData.description}</p>
          </div>
        )}
        {results && !isLoading && <ResultDisplay results={results} />}
      </div>
    </div>
  );
}

export default App;