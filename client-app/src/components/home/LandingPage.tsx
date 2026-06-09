import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { Sun, Moon, ArrowRight, Package, Layers, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const { language, setLanguage, theme, toggleTheme } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isTr = language === 'tr';

  return (
    <div id="splash" style={{ 
      position: 'relative', 
      overflowY: 'auto', 
      padding: '40px 20px',
      justifyContent: 'flex-start',
      gap: '0',
      boxSizing: 'border-box'
    }}>
      {/* Top Navbar */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: theme === 'dark' ? 'rgba(24, 24, 27, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        marginBottom: '60px',
        zIndex: 100,
        boxSizing: 'border-box'
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '28px',
          letterSpacing: '3px',
          color: 'var(--text)'
        }}>
          GOOD<span style={{ color: 'var(--accent-seller)' }}>TRACK</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Language Selector */}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px' }}
          >
            {isTr ? 'ENGLISH' : 'TÜRKÇE'}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn-secondary"
            onClick={toggleTheme}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px' }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Dashboard Action Button (only if logged in) */}
          {user && (
            <button
              onClick={() => navigate(user.role === 'mfr' ? '/mfr' : '/seller/order-page')}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                background: user.role === 'mfr' ? 'var(--accent-mfr)' : 'var(--accent-seller)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isTr ? 'Panelime Git' : 'Go to Panel'}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Hero Content */}
      <div style={{ 
        textAlign: 'center', 
        maxWidth: '800px', 
        width: '100%', 
        marginBottom: '60px',
        animation: 'fadeIn 0.8s ease-out'
      }}>
        <h1 className="splash-title" style={{ fontSize: 'clamp(36px, 6vw, 68px)', marginBottom: '20px' }}>
          {isTr ? 'B2B SİPARİŞ VE ÜRETİM' : 'B2B ORDER & PRODUCTION'}<br />
          <span>{isTr ? 'TAKİP PLATFORMU' : 'TRACKING SYSTEM'}</span>
        </h1>
        
        <p style={{
          color: 'var(--muted)',
          fontSize: 'clamp(15px, 2vw, 18px)',
          lineHeight: '1.6',
          maxWidth: '650px',
          margin: '0 auto 32px',
          letterSpacing: '0.5px'
        }}>
          {isTr 
            ? 'Satıcılar ile üreticiler arasındaki sipariş süreçlerini, anlık durum güncellemelerini ve kalite kontrol süreçlerini tek ekrandan profesyonelce yönetin.'
            : 'Professionally manage order workflows, real-time updates, and quality control processes between sellers and manufacturers on a single dashboard.'}
        </p>

        {!user && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/register"
              className="btn-primary"
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                textDecoration: 'none',
                color: '#fff',
                background: 'var(--accent-seller)',
                boxShadow: '0 4px 15px var(--accent-seller-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isTr ? 'Ücretsiz Kayıt Ol' : 'Get Started Free'}
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/login"
              className="btn-secondary"
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                textDecoration: 'none',
                border: '1px solid var(--border)',
                background: 'rgba(255,255,255,0.02)'
              }}
            >
              {isTr ? 'Giriş Yap' : 'Login'}
            </Link>
          </div>
        )}
      </div>

      {/* Role Feature Grids */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '30px',
        width: '100%',
        maxWidth: '1100px',
        marginBottom: '60px'
      }}>
        {/* For Sellers */}
        <div className="feature-card seller">
          <div style={{
            background: 'var(--accent-seller-glow)',
            color: 'var(--accent-seller)',
            padding: '10px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <Package size={24} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
            {isTr ? 'Satıcılar (Sellers) İçin' : 'For Sellers'}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            {isTr 
              ? 'Müşterilerinizin özel siparişlerini üreticilere anında iletin. Özelleştirilebilir alanlar ekleyerek her siparişi en ince detayına kadar tanımlayın.' 
              : 'Transmit customized customer orders to manufacturers instantly. Define custom features and manage client specifications with ease.'}
          </p>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0, 
            color: 'var(--muted)', 
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} style={{ color: 'var(--accent-seller)' }} />
              {isTr ? 'Akıllı ürün kataloğu entegrasyonu' : 'Smart product catalog integration'}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} style={{ color: 'var(--accent-seller)' }} />
              {isTr ? 'Dinamik özellik tanımlama (Renk, Boyut vb.)' : 'Dynamic custom field definitions'}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} style={{ color: 'var(--accent-seller)' }} />
              {isTr ? 'Üretici ağ bağlantısı ve anlık onay' : 'Manufacturer networking and instant approval'}
            </li>
          </ul>
        </div>

        {/* For Manufacturers */}
        <div className="feature-card mfr">
          <div style={{
            background: 'var(--accent-mfr-glow)',
            color: 'var(--accent-mfr)',
            padding: '10px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <Layers size={24} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: 'var(--text)' }}>
            {isTr ? 'Üreticiler (Manufacturers) İçin' : 'For Manufacturers'}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            {isTr 
              ? 'Gelen üretim taleplerini organize edin. Hatalı veya eksik durumları resimli hata bildirimi ile satıcıya anında raporlayarak fireyi azaltın.'
              : 'Organize incoming production pipelines. Report defects or missing elements with photographic evidence to reduce communication delays.'}
          </p>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0, 
            color: 'var(--muted)', 
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} style={{ color: 'var(--accent-mfr)' }} />
              {isTr ? 'Hata / Kusur görsel yükleme sistemi' : 'Defect and missing item image logging'}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} style={{ color: 'var(--accent-mfr)' }} />
              {isTr ? 'Tarihsel sipariş zaman tüneli' : 'Historical order timeline visualizer'}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} style={{ color: 'var(--accent-mfr)' }} />
              {isTr ? 'Gerçek zamanlı SignalR bildirimleri' : 'Real-time SignalR notifications'}
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'auto',
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: '12px',
        letterSpacing: '1px'
      }}>
        &copy; {new Date().getFullYear()} GOODTRACK. {isTr ? 'TÜM HAKLARI SAKLIDAR.' : 'ALL RIGHTS RESERVED.'}
      </div>
    </div>
  );
}
