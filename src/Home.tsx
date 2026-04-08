import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const stats = [
    {
      label: 'Pending Cases',
      value: '23',
      change: '+5 today',
      changeType: 'neutral' as const,
      icon: '📋'
    },
    {
      label: 'Completed Today',
      value: '12',
      change: '+3 vs yesterday',
      changeType: 'positive' as const,
      icon: '✓'
    },
    {
      label: 'AI Accuracy',
      value: '94.2%',
      change: '+2.3% this month',
      changeType: 'positive' as const,
      icon: '🎯'
    },
    {
      label: 'Avg Time Saved',
      value: '8.4 min',
      change: 'per synoptic',
      changeType: 'neutral' as const,
      icon: '⚡'
    }
  ];

  const recentCases = [
    { id: 'S25-12345', patient: 'Smith, J.', type: 'Breast', status: 'In Progress', aiGenerated: true },
    { id: 'S25-12344', patient: 'Johnson, M.', type: 'Colon', status: 'Review', aiGenerated: true },
    { id: 'S25-12343', patient: 'Williams, R.', type: 'Lung', status: 'Completed', aiGenerated: false },
    { id: 'S25-12342', patient: 'Brown, K.', type: 'Prostate', status: 'In Progress', aiGenerated: true }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Navigation */}
      <nav
        style={{
          background: 'white',
          borderBottom: '2px solid #e2e8f0',
          padding: '12px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <svg width="160" height="50" viewBox="0 0 700 200">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#0891B2', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#0E7490', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <polygon 
            points="100,30 165,65 165,135 100,170 35,135 35,65" 
            fill="url(#logoGrad)" 
            stroke="#0E7490" 
            strokeWidth="3"
          />
          <circle cx="100" cy="100" r="42" fill="#FFFFFF" stroke="#0E7490" strokeWidth="3"/>
          <rect x="78" y="80" width="44" height="40" rx="2.5" fill="none" stroke="#0891B2" strokeWidth="2.5"/>
          <line x1="84" y1="88" x2="116" y2="88" stroke="#0891B2" strokeWidth="2" strokeLinecap="round"/>
          <line x1="84" y1="96" x2="116" y2="96" stroke="#0891B2" strokeWidth="2" strokeLinecap="round"/>
          <line x1="84" y1="104" x2="102" y2="104" stroke="#0891B2" strokeWidth="2" strokeLinecap="round"/>
          <polyline 
            points="84,111 91,116 116,94" 
            fill="none" 
            stroke="#10B981" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <text 
            x="200" 
            y="125" 
            fontFamily="'Inter', 'Segoe UI', Roboto, sans-serif" 
            fontSize="72" 
            fontWeight="700" 
            fill="#1E293B"
          >
            PathScribe
            <tspan fontSize="36" fill="#0891B2" dy="-22" dx="6">AI</tspan>
          </text>
        </svg>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button
            onClick={() => navigate('/worklist')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: '#64748b'
            }}
          >
            Worklist
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/maintenance')}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#64748b'
              }}
            >
              Admin
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {user?.role === 'admin' ? 'System Admin' : 'Pathologist'}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              {user?.initials}
            </div>
            <button
              onClick={logout}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#64748b'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 8px 0'
            }}
          >
            Welcome back, {user?.name.split(' ')[1]}
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
            Here's your dashboard overview for today
          </p>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            marginBottom: '32px'
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}
              >
                <div style={{ fontSize: '28px' }}>{stat.icon}</div>
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '4px'
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: '8px'
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color:
                    stat.changeType === 'positive'
                      ? '#10b981'
                      : stat.changeType === 'negative'
                      ? '#ef4444'
                      : '#64748b'
                }}
              >
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Recent Cases */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                Recent Cases
              </h2>
              <button
                onClick={() => navigate('/worklist')}
                style={{
                  padding: '6px 12px',
                  background: '#0891B2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                View All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentCases.map((case_) => (
                <div
                  key={case_.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#1e293b',
                          fontFamily: 'monospace'
                        }}
                      >
                        {case_.id}
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {case_.patient} • {case_.type}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {case_.aiGenerated && (
                      <span
                        style={{
                          padding: '4px 8px',
                          background: '#dbeafe',
                          color: '#0891B2',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '4px'
                        }}
                      >
                        AI
                      </span>
                    )}
                    <span
                      style={{
                        padding: '4px 12px',
                        background:
                          case_.status === 'Completed'
                            ? '#d1fae5'
                            : case_.status === 'Review'
                            ? '#fef3c7'
                            : '#e0f2fe',
                        color:
                          case_.status === 'Completed'
                            ? '#065f46'
                            : case_.status === 'Review'
                            ? '#92400e'
                            : '#0c4a6e',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '4px'
                      }}
                    >
                      {case_.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0'
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                margin: '0 0 20px 0'
              }}
            >
              Quick Actions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => navigate('/worklist')}
                style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #0891B2, #0E7490)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '20px' }}>📋</span>
                <span>Open Worklist</span>
              </button>

              <button
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  color: '#1e293b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '20px' }}>🔍</span>
                <span>Search Cases</span>
              </button>

              <button
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  color: '#1e293b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '20px' }}>📊</span>
                <span>View Reports</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/maintenance')}
                  style={{
                    padding: '16px',
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde047',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>⚙️</span>
                  <span>Admin Dashboard</span>
                </button>
              )}
            </div>

            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                background: '#ecfeff',
                borderRadius: '8px',
                border: '1px solid #cffafe'
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0891B2',
                  marginBottom: '4px'
                }}
              >
                💡 Tip
              </div>
              <div style={{ fontSize: '12px', color: '#0c4a6e', lineHeight: 1.5 }}>
                The AI auto-generates synoptics nightly. Review them in the morning for
                faster turnaround.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
