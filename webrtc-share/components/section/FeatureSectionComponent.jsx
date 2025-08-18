"use client"
import React from 'react';
import { MessageCircle, Search, Languages, DollarSign, Users, CircleOffIcon, LanguagesIcon, SearchIcon, Video, VideoIcon, SearchCheck } from 'lucide-react';
import { TypeAnimation } from 'react-type-animation';


const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="flex flex-col items-center text-center p-4 md:p-6">
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-purple flex items-center justify-center mb-3 md:mb-4">
        {icon}
      </div>
      <h3 className="font-bold mb-2 text-base md:text-lg whitespace-pre">{title.split("").map((cha, index) => (
        <React.Fragment key={index}>
          {
            cha == "|" ? <br /> : `${cha}`
          }
        </React.Fragment>
      ))}</h3>
      <p className="text-gray-600 whitespace-pre text-sm md:text-base">{description.split("").map((cha, index) => (
        <React.Fragment key={index}>
          {
            cha == "|" ? <br /> : `${cha}`
          }
        </React.Fragment>
      ))}</p>
    </div>
  );
};

export const FeaturesSection = () => {
  const features = [
    {
      icon: <img src="/icons/video-icons.png" />,
      title: "Make conversations | faster and easier",
      description: "See what your | customers see"
    },
    {
      icon: <img src="/icons/majesticons_search.png" />,
      title: "Diagnose faults | 3x faster",
      description: "Get visual | confirmation of issues"
    },
    {
      icon: <img src="/icons/tabler_clock-filled.png" />,
      title: "Reduce service calls and | improve first-time resolution",
      description: "Save time and money with | accurate diagnostics"
    },
    {
      icon: <img src="/icons/fa-solid_user-friends.png" />,
      title: "Guide your customers | with live video",
      description: "Communicate with | clarity and precision"
    },
    {
      icon: <img src="/icons/fluent_record-12-regular.png" />,
      title: "Record videos and | images your way",
      description: "Record whats on your | screen instantly"
    },
    {
      icon: <img src="/icons/diagnose-icon.png" />,
      title: "Capture and share crucial | information visually",
      description: "Collaborate and solve | problems faster"
    },
    {
      icon: <img src="/icons/lang-icon.png" />,
      title: "Support vulnerable | customers ",
      description: "Visual communication | bridges language barriers"
    },
    {
      icon: <img src="/icons/video-icons.png" />,
      title: "Goodbye long | messages",
      description: "Say hello to videos | and screenshots"
    }
  ];

  return (
    <section className="py-12 md:py-16 bg-white relative overflow-hidden min-h-screen" id="benefit" >
      <div className='w-[10rem] h-[10rem] md:w-[12rem] md:h-[12rem] bg-purple text-white flex items-end justify-center p-2 rotate-[-40deg] absolute -top-[6rem] md:-top-[7rem] -left-[5rem] md:-left-[6rem] -z-0'>
        <h1 className='text-lg md:text-xl'>Benefits</h1>
      </div>
      <div className="container mx-auto px-4 md:px-8">        <div className="min-h-[6rem] md:min-h-[8rem] flex items-center justify-center mb-12 md:mb-16 relative z-10">
          {/* Mobile TypeAnimation */}
          <h2 className="block md:hidden text-xl font-extrabold text-center max-w-4xl mx-auto px-4">
            <TypeAnimation
              sequence={[
                'Connect, engage and support customers with instant video links',
                25000,
                "",
                500
              ]}
              wrapper="span"
              speed={300}
              style={{ fontSize: '20px', display: 'inline-block', whiteSpace: 'normal', lineHeight: '1.4', fontWeight: '800' }}
              repeat={Infinity}
            />
          </h2>
          
          {/* Desktop TypeAnimation */}
          <h2 className="hidden md:block text-3xl font-bold text-center max-w-6xl mx-auto">
            <TypeAnimation
              sequence={[
                'Connect, engage and support your customers \nwith instant video links',
                25000,
                "",
                500
              ]}
              wrapper="span"
              speed={300}
              style={{ fontSize: '30px', display: 'inline-block', whiteSpace: 'pre-line' }}
              repeat={Infinity}
            />
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
        <div className="flex justify-center items-center flex-col mt-6 md:mt-8">
          <img src="/devices.svg" alt="Videodesk" className="w-48 md:w-60 mb-2" />
          <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center text-black">Connect. Engage. Support.</h2>
        </div>
      </div>
    </section>
  );
};
