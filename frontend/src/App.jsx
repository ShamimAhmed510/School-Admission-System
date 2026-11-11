import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export default function App() {
  const [studentId, setStudentId] = useState(localStorage.getItem('studentId') || '');
  const [studentName, setStudentName] = useState(localStorage.getItem('studentName') || '');
  const [classes, setClasses] = useState([]);
  const [myHolds, setMyHolds] = useState([]);
  
  // Admin state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminReport, setAdminReport] = useState([]);

  // Admin Create Class Dropdown state
  const [classNameSel, setClassNameSel] = useState('Class 6');
  const [shiftSel, setShiftSel] = useState('Morning Shift');
  const [totalSeatsSel, setTotalSeatsSel] = useState(120);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    localStorage.setItem('studentId', studentId);
    localStorage.setItem('studentName', studentName);
  }, [studentId, studentName]);

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/classes`);
      if (res.ok) setClasses(await res.json());
    } catch (e) {
      // ignore
    }
  };

  const fetchMyHolds = async () => {
    if (!studentId || studentId.trim().length !== 17) return;
    try {
      const res = await fetch(`${API_BASE}/me/holds`, {
        headers: { 'X-Student-Id': studentId }
      });
      if (res.ok) setMyHolds(await res.json());
    } catch (e) {
      // ignore
    }
  };

  const fetchAdminReport = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/report?username=admin&password=admin123`);
      if (res.ok) {
        setAdminReport(await res.json());
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchMyHolds();
    if (isAdminLoggedIn) fetchAdminReport();
    
    const interval = setInterval(() => {
      fetchClasses();
      fetchMyHolds();
      if (isAdminLoggedIn) fetchAdminReport();
    }, 3000);
    return () => clearInterval(interval);
  }, [studentId, isAdminLoggedIn]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUser === 'admin' && adminPass === 'admin123') {
      setIsAdminLoggedIn(true);
      setErrorMsg('');
      fetchAdminReport();
    } else {
      setErrorMsg('ভুল Admin Username অথবা Password!');
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: classNameSel, shift: shiftSel, totalSeats: Number(totalSeatsSel) })
      });
      if (res.ok) {
        setSuccessMsg('সফলভাবে নতুন Class ও Shift তৈরি হয়েছে!');
        fetchClasses();
        fetchAdminReport();
      } else {
        setErrorMsg('Class তৈরি করা যায়নি।');
      }
    } catch (e) {
      setErrorMsg('সার্ভার এরর');
    }
  };

  const handleApply = async (classId) => {
    if (!studentId || studentId.trim().length !== 17) {
      setErrorMsg('অনুগ্রহ করে সঠিক ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর লিখুন।');
      return;
    }
    if (!studentName.trim()) {
      setErrorMsg('শিক্ষার্থীর নাম লিখুন।');
      return;
    }
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/holds`, {
        method: 'POST',
        headers: { 
          'X-Student-Id': studentId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentName })
      });
      if (res.status === 409) {
        setErrorMsg('দুঃখিত! এই ক্লাসের সব আসন পূর্ণ (Seat Seshesh) অথবা আপনার আবেদন ইতিমধ্যে বিদ্যমান।');
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || 'আবেদন করতে সমস্যা হয়েছে।');
      } else {
        setSuccessMsg('আবেদন সফল হয়েছে! ১০ মিনিটের মধ্যে ভর্তি ফি পরিশোধ করুন।');
        fetchClasses();
        fetchMyHolds();
      }
    } catch (e) {
      setErrorMsg('নেটওয়ার্ক সমস্যা!');
    }
  };

  const handleConfirm = async (holdId) => {
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/holds/${holdId}/confirm`, {
        method: 'POST',
        headers: { 'X-Student-Id': studentId }
      });
      if (res.ok) {
        setSuccessMsg('ভর্তি সফলভাবে নিশ্চিত (CONFIRMED) হয়েছে!');
        fetchClasses();
        fetchMyHolds();
      } else {
        setErrorMsg('মেয়াদ শেষ বা পেমেন্ট ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      setErrorMsg('পেমেন্ট এরর');
    }
  };

  const handleCancel = async (holdId) => {
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/holds/${holdId}`, {
        method: 'DELETE',
        headers: { 'X-Student-Id': studentId }
      });
      if (res.ok || res.status === 204) {
        setSuccessMsg('আবেদন বাতিল করা হয়েছে।');
        fetchClasses();
        fetchMyHolds();
      }
    } catch (e) {
      setErrorMsg('বাতিল করা যায়নি।');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: 'auto', background: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ color: '#1e293b', margin: 0 }}>School Admission System</h2>
        <div>
          {isAdminLoggedIn ? (
            <button onClick={() => setIsAdminLoggedIn(false)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>
              Admin Logout
            </button>
          ) : (
            <form onSubmit={handleAdminLogin} style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" placeholder="Admin ID" value={adminUser} onChange={e => setAdminUser(e.target.value)} style={{ padding: '5px', width: '90px' }} />
              <input type="password" placeholder="Pass" value={adminPass} onChange={e => setAdminPass(e.target.value)} style={{ padding: '5px', width: '90px' }} />
              <button type="submit" style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Admin Login</button>
            </form>
          )}
        </div>
      </header>

      {errorMsg && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #fecaca' }}>{errorMsg}</div>}
      {successMsg && <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #bbf7d0' }}>{successMsg}</div>}

      {!isAdminLoggedIn ? (
        <>
          {/* Student Profile Input */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '25px' }}>
            <h3 style={{ marginTop: 0, color: '#334155' }}>শিক্ষার্থীর পরিচয় (Student Profile)</h3>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>শিক্ষার্থীর নাম (Student Name):</label>
                <input 
                  type="text" 
                  value={studentName} 
                  onChange={e => setStudentName(e.target.value)} 
                  placeholder="e.g. Md. Rahim" 
                  style={{ padding: '8px', width: '220px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>১৭ অঙ্কের জন্ম নিবন্ধন নম্বর (Student ID):</label>
                <input 
                  type="text" 
                  value={studentId} 
                  onChange={e => setStudentId(e.target.value)} 
                  placeholder="e.g. 20152691234567890" 
                  style={{ padding: '8px', width: '250px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>

          {/* Classes Table */}
          <h3 style={{ color: '#334155' }}>ক্লাস ও শিফট তালিকা (Class & Shifts)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '12px' }}>Class & Shift</th>
                <th style={{ padding: '12px' }}>Total Seats</th>
                <th style={{ padding: '12px' }}>Held (Pending)</th>
                <th style={{ padding: '12px' }}>Confirmed</th>
                <th style={{ padding: '12px' }}>Available Seats</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>কোনো ক্লাস শিফট তৈরি করা হয়নি। Admin লগইন করে ক্লাস তৈরি করুন।</td></tr>
              ) : (
                classes.map(c => {
                  const isFull = c.availableSeats <= 0;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e293b' }}>{c.name}</td>
                      <td style={{ padding: '12px' }}>{c.totalSeats}</td>
                      <td style={{ padding: '12px' }}>{c.heldSeats}</td>
                      <td style={{ padding: '12px' }}>{c.confirmedSeats}</td>
                      <td style={{ padding: '12px', color: isFull ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                        {isFull ? 'SEAT SESHEH (Full)' : c.availableSeats}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button 
                          onClick={() => handleApply(c.id)} 
                          disabled={isFull}
                          style={{ 
                            padding: '6px 14px', 
                            background: isFull ? '#cbd5e1' : '#2563eb', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: isFull ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {isFull ? 'Seat Sesh' : 'আবেদন করুন'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* My Applications (Enhanced Card Design) */}
          <h3 style={{ color: '#334155' }}>আমার আবেদনসমূহ (My Applications)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {myHolds.length === 0 ? (
              <p style={{ color: '#64748b' }}>আপনার কোনো চলমান আবেদন নেই। ওপরে জন্ম নিবন্ধন নম্বর লিখে ক্লাস সিলেক্ট করে আবেদন করুন।</p>
            ) : (
              myHolds.map(h => {
                const isConfirmed = h.status === 'CONFIRMED';
                const isExpired = h.status === 'EXPIRED';
                const badgeColor = isConfirmed ? '#16a34a' : isExpired ? '#dc2626' : '#d97706';

                return (
                  <div key={h.holdId} style={{ background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>{h.className} - {h.shift}</h4>
                      <span style={{ background: badgeColor, color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                        {h.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' }}>
                      <div><strong>Student Name:</strong> {h.studentName}</div>
                      <div><strong>Student ID / Birth No:</strong> {studentId || 'N/A'}</div>
                      <div><strong>Hold ID:</strong> {h.holdId}</div>
                      <div><strong>Expires at:</strong> {new Date(h.expiresAt).toLocaleString()}</div>
                    </div>

                    {isConfirmed ? (
                      <div style={{ color: '#16a34a', fontSize: '13px', fontWeight: 'bold', background: '#f0fdf4', padding: '8px', borderRadius: '4px' }}>
                        Admission confirmed. No further action needed.
                      </div>
                    ) : isExpired ? (
                      <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 'bold', background: '#fef2f2', padding: '8px', borderRadius: '4px' }}>
                        Payment time expired. Seat released automatically.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => handleConfirm(h.holdId)} style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                          ভর্তি ফি দিন (Confirm)
                        </button>
                        <button onClick={() => handleCancel(h.holdId)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                          বাতিল
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Admin Dashboard */
        <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Admin Control Panel</h3>

          {/* Add Class Form with Dropdowns */}
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '6px', marginBottom: '25px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#334155' }}>নতুন Class ও Shift তৈরি করুন</h4>
            <form onSubmit={handleCreateClass} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Class Select:</label>
                <select value={classNameSel} onChange={e => setClassNameSel(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  {['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10'].map(cl => (
                    <option key={cl} value={cl}>{cl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Shift Select:</label>
                <select value={shiftSel} onChange={e => setShiftSel(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  {['Morning Shift', 'Day Shift', 'Evening Shift'].map(sh => (
                    <option key={sh} value={sh}>{sh}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Total Seats:</label>
                <input type="number" value={totalSeatsSel} onChange={e => setTotalSeatsSel(e.target.value)} style={{ padding: '7px', width: '80px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              </div>
              <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Class তৈরি করুন
              </button>
            </form>
          </div>

          <h4 style={{ color: '#334155' }}>ক্লাস অনুযায়ী শিক্ষার্থী ও সিটের হিসাব (Class Wise Report)</h4>
          {adminReport.length === 0 ? (
            <p style={{ color: '#64748b' }}>কোনো ক্লাস ডাটা নেই।</p>
          ) : (
            adminReport.map(rep => (
              <div key={rep.classId} style={{ marginBottom: '25px', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, color: '#0f172a' }}>{rep.className} - {rep.shift}</h4>
                  <div style={{ fontSize: '14px', color: '#334155', display: 'flex', gap: '15px' }}>
                    <span>Total Seats: <strong>{rep.totalSeats}</strong></span>
                    <span>Confirmed: <strong style={{color: '#16a34a'}}>{rep.confirmedCount}</strong></span>
                    <span>Pending (Held): <strong style={{color: '#d97706'}}>{rep.pendingCount}</strong></span>
                    <span>Available: <strong style={{color: '#2563eb'}}>{rep.availableSeats}</strong></span>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#fafafa', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#64748b' }}>
                      <th style={{ padding: '10px' }}>Student Name</th>
                      <th style={{ padding: '10px' }}>Student ID / Birth Reg No</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Expires At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rep.students.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '15px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>এই ক্লাসে কোনো আবেদনকারী নেই</td></tr>
                    ) : (
                      rep.students.map(st => (
                        <tr key={st.holdId} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                          <td style={{ padding: '10px', fontWeight: '500' }}>{st.studentName}</td>
                          <td style={{ padding: '10px', fontFamily: 'monospace' }}>{st.studentId}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '10px', 
                              fontSize: '11px', 
                              fontWeight: 'bold',
                              background: st.status === 'CONFIRMED' ? '#dcfce7' : st.status === 'HELD' ? '#fef3c7' : '#fee2e2',
                              color: st.status === 'CONFIRMED' ? '#166534' : st.status === 'HELD' ? '#92400e' : '#991b1b'
                            }}>
                              {st.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px', color: '#64748b' }}>{new Date(rep.students.find(s=>s.holdId===st.holdId).expiresAt).toLocaleTimeString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
