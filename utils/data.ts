import { Video, ReactionType, Subscription, Wish, ParentalControls, AppData, User } from '../types';
import { MOCK_FAMILIES } from '../constants';

// Use members from the first mock family for consistent initial data.
const initialFamily = MOCK_FAMILIES[0];
const USER_DAD = initialFamily.members.find(m => m.role === 'parent' && m.name.includes('Marcial'))!;
const USER_MOM = initialFamily.members.find(m => m.role === 'parent' && m.name.includes('Jane'))!;
const USER_CHILD = initialFamily.members.find(m => m.role === 'child')!;

const getInitialData = (): AppData => {
  const INITIAL_VIDEOS: Video[] = [
    {
      id: 'gBq2H2a5_5k',
      url: 'https://www.youtube.com/watch?v=gBq2H2a5_5k',
      title: 'Amazing Animals | Fun Facts for Kids',
      summary: 'Explore the animal kingdom! This video is packed with amazing facts about all sorts of animals, from the tiniest insects to the largest whales. It is perfect for curious kids who love wildlife.',
      sender: USER_DAD,
      recipients: [USER_CHILD],
      status: 'unseen',
      watchDuration: 0,
      totalDuration: 185, // 3 minutes 5 seconds
      platform: 'youtube',
      reactions: {
        [ReactionType.LOVE]: 0,
        [ReactionType.DISLIKE]: 0,
      },
      userReaction: null,
      comments: [
        {
          id: '1',
          author: USER_DAD,
          text: 'Let me know what you think of this one!',
          timestamp: '10:30 AM',
        },
      ],
      chatHistory: [],
    },
    {
      id: 'yPYZpwSpKmA',
      url: 'https://www.youtube.com/watch?v=yPYZpwSpKmA',
      title: 'How to Draw a Cartoon Dog',
      summary: 'This is a simple step-by-step tutorial on how to draw a cute cartoon dog. The video is easy to follow and perfect for kids who love to draw. Grab your pencil and paper and get ready to create your own masterpiece!',
      sender: USER_MOM,
      recipients: [USER_CHILD],
      status: 'seen',
      watchDuration: 300,
      totalDuration: 320,
      platform: 'youtube',
      reactions: {
        [ReactionType.LOVE]: 1,
        [ReactionType.DISLIKE]: 0,
      },
      userReaction: ReactionType.LOVE,
      comments: [
        {
          id: '2',
          author: USER_MOM,
          text: 'Hope you like this drawing tutorial!',
          timestamp: '11:00 AM',
        },
        {
          id: '3',
          author: USER_CHILD,
          text: 'I loved it! I drew a dog!',
          timestamp: '11:05 AM',
        },
      ],
      chatHistory: [],
    },
  ];

  const INITIAL_SUBSCRIPTIONS: Subscription[] = [
    {
      id: 'UCX6b17PVsYBQ0ip5gyeme-Q',
      name: 'Nat Geo Kids',
      avatarUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_k6q_TnyJ7G_n_L_2aV5og-0Eb4e0U_21JvBZFbQ2E=s176-c-k-c0x00ffffff-no-rj',
      description: 'Nat Geo Kids makes it fun to explore your world with weird, wild, and wacky videos! Videos feature awesome animals, cool science, funny pets, and more!'
    },
    {
      id: 'UCp_S3-xJw-T6G_zA09p7gYw',
      name: 'PBS KIDS',
      avatarUrl: 'https://yt3.googleusercontent.com/ytc/AIdro_n0B6oED2wT-2An-v49EuO2jWk2-2a7251Jh2Qx4A=s176-c-k-c0x00ffffff-no-rj',
      description: 'Watch full episodes and clips from your favorite PBS KIDS shows! Help kids learn reading, math, science, and important life lessons with your favorite characters.'
    },
  ];

  const INITIAL_WISHES: Wish[] = [
    {
      id: 'wish1',
      text: 'I want to see videos about funny cats!',
      status: 'pending',
      author: USER_CHILD,
      timestamp: 'Yesterday',
    },
  ];

  const INITIAL_PARENTAL_CONTROLS: ParentalControls = {
    dailyTimeLimit: 60, // 60 minutes
    schedule: {
      start: '09:00',
      end: '18:00',
    },
    isEnabled: false, // Controls are off by default
  };

  return {
    videos: INITIAL_VIDEOS,
    subscriptions: INITIAL_SUBSCRIPTIONS,
    wishes: INITIAL_WISHES,
    parentalControls: INITIAL_PARENTAL_CONTROLS,
    dailyWatchTime: 0,
    lastResetDate: new Date().toDateString(),
  };
};

// For simulating adding a video via a link
export const SHARABLE_VIDEOS: Video[] = [
  {
    id: 'L43S_Iq-uSM',
    url: 'https://www.youtube.com/watch?v=L43S_Iq-uSM',
    title: 'Science Max | FULL EPISODE | Chemistry | Season 1',
    summary: 'Join Phil for a brand new series of Science Max, the series that turbocharges all the science experiments you\'ve done at home. In this episode we explore the science of chemistry with some amazing experiments!',
    sender: MOCK_FAMILIES[0].members[0],
    recipients: [],
    status: 'unseen',
    watchDuration: 0,
    totalDuration: 1320,
    platform: 'youtube',
    reactions: {
      [ReactionType.LOVE]: 0,
      [ReactionType.DISLIKE]: 0,
    },
    userReaction: null,
    comments: [
      {
        id: 'share_1',
        author: MOCK_FAMILIES[0].members[0],
        text: 'Found this cool science video for you!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    chatHistory: [],
  },
];


export default getInitialData;