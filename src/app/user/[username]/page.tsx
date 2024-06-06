"use client";
import React, { useState, useEffect } from "react";
import { getUserByUsername } from '@/utils/firebaseUtils'; // Adjust the import based on your file structure
import { notFound } from 'next/navigation';
import styles from '@/styles/userlinkPage.module.scss';
import Image from 'next/image';
import Loading from '@/components/Loading';

type UserPageProps = {
  params: {
    username: string;
  };
};

const UserPage = ({ params }: UserPageProps) => {
  const username = params.username;
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getUserByUsername(username);
        if (data) {
          setUserData(data);
          console.log('Fetched user data:', data);
        } else {
          notFound();
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        notFound();
      }
    };

    fetchData();
  }, [username]);

  if (!userData) {
    return <Loading />;
  }

  const theme = {
    background: userData.background,
    color: userData.color,
  };
  

  return (
    <>
      {userData && (
        <div className={styles.containerPublicProfile}>
          <div className={styles.background}></div>
          <div className={styles.innerContainer}>
            <div className={styles.profileContainer}>
              <Image 
                src={userData.photoUrl} 
                alt={userData.username} 
                width={150} 
                height={150} 
              />
              <p className={styles.username}>@{userData.username}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserPage;
