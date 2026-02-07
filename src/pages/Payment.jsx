import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cardIcon from '../icons/49c86b0a-0421-427f-a579-b16479019174.svg';
import sbpIcon from '../icons/90b04acf-db51-41da-aedf-b2165659c130.svg';
import sberpayIcon from '../icons/890e1f12-2f45-475b-ae4d-5390948a2442.svg';
import tpayIcon from '../icons/529658da-f94a-48c3-b8af-63fdc6516f27.svg';

export default function Payment() {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [rememberCard, setRememberCard] = useState(false);

  return (
    <div className="App">
        <div className='payment-page'>
      {/* Header */}
      <div className="payment-header">
        <button
          className="payment-back"
          onClick={() => navigate(-1)}
          aria-label="Назад"
          style={{borderRadius: 100}}
        >
          <svg width="6" height="14" viewBox="0 0 6 14" fill="none">
            <path
              d="M5 1L1 7L5 13"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="payment-title">Способ оплаты</h1>
      </div>

      {/* Card block - МИР / Visa / Mastercard (selected) */}
      <div
        className={`payment-method-card ${selectedMethod === 'card' ? 'selected' : ''}`}
        onClick={() => setSelectedMethod('card')}
      >
        <div className="payment-method-row">
          <img src={cardIcon} alt="" width={16} height={12} className="payment-method-icon" />
          <span className="payment-method-label">МИР / Visa / Mastercard</span>
        </div>

        {selectedMethod === 'card' && (
          <div className="payment-card-form">
            <div className="payment-input-wrap">
              <input
                type="text"
                placeholder="0000 - 0000 - 0000 - 0000"
                className="payment-input"
              />
            </div>
            <div className="payment-input-wrap">
              <input
                type="text"
                placeholder="Cardholder Name"
                className="payment-input"
              />
            </div>
            <div className="payment-input-row">
              <div className="payment-input-wrap half">
                <input type="text" placeholder="MM/YY" className="payment-input" />
              </div>
              <div className="payment-input-wrap half">
                <input type="text" placeholder="CVV" className="payment-input" />
              </div>
            </div>
            <label className="payment-checkbox">
              <span
                className={`payment-checkbox-box ${rememberCard ? 'checked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setRememberCard(!rememberCard);
                }}
              >
                {rememberCard && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L4 7L9 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="payment-checkbox-label">Remember this card for the future use</span>
            </label>
          </div>
        )}
      </div>

      {/* SBP */}
      <div
        className={`payment-method-card simple ${selectedMethod === 'sbp' ? 'selected' : ''}`}
        onClick={() => setSelectedMethod('sbp')}
      >
        <img src={sbpIcon} alt="" width={13} height={16} className="payment-method-icon" />
        <span className="payment-method-label">SBP</span>
        <svg className="payment-arrow" width="4" height="10" viewBox="0 0 4 10">
          <path d="M1 1L3 5L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* SberPay */}
      <div
        className={`payment-method-card simple ${selectedMethod === 'sberpay' ? 'selected' : ''}`}
        onClick={() => setSelectedMethod('sberpay')}
      >
        <img src={sberpayIcon} alt="" width={16} height={16} className="payment-method-icon" />
        <span className="payment-method-label">SberPay</span>
        <svg className="payment-arrow" width="4" height="10" viewBox="0 0 4 10">
          <path d="M1 1L3 5L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* T-Pay */}
      <div
        className={`payment-method-card simple ${selectedMethod === 'tpay' ? 'selected' : ''}`}
        onClick={() => setSelectedMethod('tpay')}
      >
        <img src={tpayIcon} alt="" width={16} height={16} className="payment-method-icon" />
        <span className="payment-method-label">T-Pay</span>
        <svg className="payment-arrow" width="4" height="10" viewBox="0 0 4 10">
          <path d="M1 1L3 5L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Payment Security */}
      <div className="payment-security">
        <svg className="payment-security-icon" width="14" height="16" viewBox="0 0 14 16" fill="none">
          <path
            d="M7 1L1 4V8C1 11.5 3.5 14.5 7 15C10.5 14.5 13 11.5 13 8V4L7 1Z"
            fill="#a0c058"
            stroke="#a0c058"
            strokeWidth="0.5"
          />
        </svg>
        <div>
          <h3 className="payment-security-title">Payment Security</h3>
          <p className="payment-security-text">
            We do not store or process your payment card details.<br />
            All payment information is transmitted in encrypted form and processed only by certified payment systems.
          </p>
        </div>
      </div>

      {/* Pay button */}
      <div className="payment-footer">
        <div className="payment-overlay" />
        <button className="payment-btn">Оплатить 100$</button>
      </div>
    </div></div>
  );
}
