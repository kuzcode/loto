import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { databases, appwriteIds } from '../appwrite';
import { useAuth } from '../auth/AuthProvider';

export default function Balance() {
    const navigate = useNavigate();
    const [todep, settodep] = useState(0)

    const { user } = useAuth();
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!user?.$id || !appwriteIds.usersCollectionId) {
                setBalance(0);
                return;
            }
            try {
                const doc = await databases.getDocument(
                    appwriteIds.databaseId,
                    appwriteIds.usersCollectionId,
                    user.$id
                );
                if (!cancelled) {
                    setBalance(typeof doc.balance === 'number' ? doc.balance : 0);
                }
            } catch (_) {
                if (!cancelled) setBalance(0);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [user]);

    return (
        <div className='App'>
            <div className='deposit-header'>
                <button style={{
                    background: '#2c3548',
                    boxShadow: '0 0 20px #0000005e',
                    border: 'none',
                    borderRadius: 100,
                    color: '#fff',
                    fontSize: 25,
                    height: 40,
                    width: 40
                }} onClick={() => navigate(-1)}>{'<'}</button>
            </div>
            <div>
                <p style={{
                    fontSize: 20,
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: 400,
                    margin: 0
                }}>Баланс</p>
                <h2 style={{
                    fontSize: 32,
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: 700,
                    margin: '4px 0'
                }}>{balance}₼</h2>
            </div>

            <div style={{
                display: 'flex',
                maxWidth: 500,
                width: '100%',
                padding: 0,
                justifyContent: 'center',
                margin: '20px auto',
                gap: 12
            }}>
                <button
                onClick={() => {navigate('/deposit')}}
                    style={{
                        backgroundColor: '#83a9f6',
                        padding: '12px 28px',
                        borderRadius: 14,
                        border: 'none',
                        boxShadow: '0 0 24px 0 rgba(0, 0, 0, 0.2)',
                    }}
                >
                    <p style={{
                        color: '#fff',
                        margin: 0,
                    }}
                    >Пополнить</p>
                </button>
                <button
                    style={{
                        backgroundImage: 'linear-gradient(to bottom, #686d89, #5d627c)',
                        padding: '12px 28px',
                        borderRadius: 14,
                        border: 'none',
                        boxShadow: '0 0 24px 0 rgba(0, 0, 0, 0.2)',
                    }}
                >
                    <p style={{
                        color: '#fff',
                        margin: 0
                    }}
                    >Вывести</p>
                </button>
            </div>
        </div>
    );
}


