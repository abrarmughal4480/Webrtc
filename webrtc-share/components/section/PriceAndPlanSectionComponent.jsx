"use client"
import React from "react"
import { Check, Expand, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Fragment, useState } from "react"
import { TypeAnimation } from "react-type-animation"

export default function PriceAndPlan() {
  const [role, setRole] = useState("landlord");

  const plans = [
    {
      black: "Standard",
      name: "Free",
      price: "",
      description: "For getting started",
      subtitle: "No payment card needed",
      highlight: [],
      buttonText: "Sign up for free",
      buttonVariant: "default",
      features: [
        "Up to 15 free video links per user",
        "Capture 1 video (upto 30 seconds) on each live call",
        "Capture upto 3 image screenshots on each live call",
        "Save and retrieve up to 10 sent links in your live dashboard",
        "Store saved links in your dashboard for upto 14 days",
        "Send 1 direct shareble link to a third party for your saved videos/ images/ call notes for each call",
        "Label upto 2 of your saved videos or images in each video call",
        "Use Videodesk from any desktop/tablet to connect with any mobile device",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
      ],
    },
    {
      name: "Plus Account",
      price: "",
      description: "For small teams",
      subtitle: "Everything in Basic, and:",
      highlight: ["Basic,"],
      buttonText: "Email: PlusAccount@Videodesk.co.uk",
      buttonVariant: "default",
      features: [
        "Up to 60 free video links per user",
        "Capture up to 2 videos (upto 45 seconds) on each live call",
        "Capture upto 6 image screenshots on each live call",
        "Keep up to 20 sent links in your live dashboard",
        "Store saved links in your dashboard for upto 31 days",
        "Send up to 2 direct shareble links to third parties for your saved videos/ images/ call notes for each call",
        "Label upto 4 of your saved videos or images in each video call",
        "Use Videodesk from any desktop/tablet to connect with any mobile device",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
      ],
    },
    {
      name: "Professional",
      price: "",
      description: "For large teams",
      subtitle: "Everything in Plus, and:",
      highlight: ["Plus,"],
      buttonText: "Try free for 14 days",
      buttonVariant: "default",
      features: [
        "Unlimited links to send by text or email",
        "Capture up to 4 (each 60 seconds) videos on each live call",
        "Capture upto 10 image screenshots on each live call",
        "Keep upto 30 saved links in your dashboard",
        "Store saved links in your dashboard for up to 3 months",
        "Send up to 3 Direct Shareble links to a third party of your saved videos/ images/ call notes",
        "Add Unlimited labels for your saved videos or images",
        "Use Videodesk from any mobile to mobile device",
        "Make a professional impression, add a custom logo to your customer messages/joining links",
        "Export your saved links to anyone or any system",
        "Get insights and stats on user feedback",
        "-",
        "-",
      ],
    },
    {
      name: "Enterprise",
      price: "",
      description: "For large businesses",
      subtitle: "Everything in Professional, and:",
      highlight: ["Professional,"],
      buttonText: "Contact us",
      buttonVariant: "default",
      features: [
        "Dedicated Account Manager",
        "Unlimited recording time for videos in each call link",
        "Unlimited screenshot images in each call link",
        "Unlimited direct shareble links to third parties of your saved videos/ images/ call notes",
        "Custom designed live video/notes page",
        "Custom designed dashboard",
        "Unlimited storage of saved links in your dashboard",
        "Keep all saved links for up to 12 months",
        "Save and back up all data to your own servers (optional)",
        "1 x half day training event (online or at your place)",
        "Custom collaboration on bespoke technology solutions for your business (no consulting fees apply)",
        "Custom development",
        "Custom implementation",
        "Custom Contract",
      ],
    },
  ]

  return (
    <section
      className="w-full py-12 md:py-16 px-4"
      style={{
        background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%)",
      }}
      id="pricing"
    >
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">Pricing and Plans</h2>
          <p className="text-white/90 text-base md:text-lg">Choose the plan that's right for you</p>
          <div className="mt-3 md:mt-4 flex items-center justify-center flex-col">
            <p className="text-white/90 text-base md:text-lg mb-3 md:mb-4">Select an option:</p>
            <Select value={role} onValueChange={value => setRole(value)}>
              <SelectTrigger className="bg-amber-500 text-white flex items-center justify-center text-lg md:text-xl font-semibold outline-none border-none w-full max-w-xs">
                <SelectValue placeholder="Social Landlord" className="w-[180px]" />
              </SelectTrigger>
              <SelectContent className={'border-none bg-white'}>
                <SelectItem value="landlordd" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Automotive</SelectItem>
                <SelectItem value="residenc" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>NHS/Health Provider</SelectItem>
                <SelectItem value="landlord" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Social Landlord</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full bg-amber-400 p-4 md:p-8 rounded-2xl mt-6 md:mt-8">
            {
              role == "landlord" ?
                (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
                    {/* Small Providers */}
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg">
                      <div className="mb-2">
                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 text-left">Small Providers:</h3>
                        <div className="flex justify-end gap-6 md:gap-8 text-sm md:text-md font-bold text-gray-700 mb-2">
                          <span>Monthly</span>
                          <span>Annual</span>
                        </div>
                      </div>

                      <div className="space-y-0">
                        <div className="flex justify-between items-center py-1 md:py-2">
                          <span className="text-xs md:text-sm text-gray-700">Upto 250 homes</span>
                          <div className="flex gap-6 md:gap-8">
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£108</span>
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£1300</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1 md:py-2">
                          <span className="text-xs md:text-sm text-gray-700">250-500 homes</span>
                          <div className="flex gap-6 md:gap-8">
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£150</span>
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£1800</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1 md:py-2">
                          <span className="text-xs md:text-sm text-gray-700">500-750 homes</span>
                          <div className="flex gap-6 md:gap-8">
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£191</span>
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£2300</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1 md:py-2">
                          <span className="text-xs md:text-sm text-gray-700">750-1000 homes</span>
                          <div className="flex gap-6 md:gap-8">
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£233</span>
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£2800</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Small to Medium Providers */}
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg">
                      <div className="mb-2">
                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 text-left">Small to Medium Providers:</h3>
                        <div className="flex justify-end gap-6 md:gap-8 text-sm md:text-md font-bold text-gray-700 mb-2">
                          <span>Monthly</span>
                          <span>Annual</span>
                        </div>
                      </div>

                      <div className="space-y-0">
                        <div className="flex justify-between items-center py-1 md:py-2">
                          <span className="text-xs md:text-sm text-gray-700">1000-1250 homes</span>
                          <div className="flex gap-6 md:gap-8">
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£275</span>
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£3300</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1 md:py-2">
                          <span className="text-xs md:text-sm text-gray-700">1250-5000 homes</span>
                          <div className="flex gap-6 md:gap-8">
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£375</span>
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£4500</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-1 md:py-2">
                          <span className="text-xs md:text-sm text-gray-700">5000-10000 homes</span>
                          <div className="flex gap-6 md:gap-8">
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£750</span>
                            <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">£9000</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Large Providers */}
                    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg">
                      <div className="mb-5 md:mb-7 flex justify-start items-center">
                        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Large Providers:</h3>
                      </div>

                      <div className="flex items-center w-full relative">
                        <div className="space-y-0 w-[50%] border-r border-black">
                          <div className="flex justify-between items-center py-1 md:py-2">
                            <span className="text-xs md:text-sm text-gray-700">10000-15000 homes</span>
                          </div>

                          <div className="flex justify-between items-center py-1 md:py-2">
                            <span className="text-xs md:text-sm text-gray-700">15000-20000 homes</span>
                          </div>

                          <div className="flex justify-between items-center py-1 md:py-2">
                            <span className="text-xs md:text-sm text-gray-700">20000+ homes</span>
                          </div>
                        </div>

                        <div className="flex-1 h-full pl-2 md:pl-4">
                          <span className="text-xs md:text-sm text-left">Custom pricing, <br />Contact us.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) :
                (
                  <h1 className="text-white text-xl md:text-3xl font-medium">
                    Custom pricing, please contact us
                  </h1>
                )
            }

          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {plans.map((plan, index) => (
            <Card key={index} className="bg-white border-0 shadow-lg h-full flex flex-col gap-2 p-0">
              <CardHeader className="pb-3 md:pb-4 mt-3 md:mt-4 px-4 md:px-6">
                <div className="flex items-center gap-2">
                  {
                    plan.black &&
                    <CardTitle className="text-2xl md:text-3xl font-bold text-black">{plan.black}</CardTitle>
                  }
                  <CardTitle className="text-2xl md:text-3xl font-bold text-amber-400">
                    {plan.name != "Free" && `${plan.name}`}
                    {plan.name == "Free" && <TypeAnimation
                      sequence={[
                        'Free',
                        15000,
                        '',
                        500
                      ]}
                      wrapper="span"
                      speed={400}
                      style={{ fontSize: '28px', display: 'inline-block' }}
                      className="md:text-3xl"
                      repeat={Infinity}
                    />}
                  </CardTitle>
                  {
                    plan.price &&
                    <div className="text-2xl md:text-3xl font-bold text-amber-400">{plan.price}</div>
                  }
                </div>
                <p className="text-sm md:text-md font-semibold text-black mb-2">{plan.description}</p>
                {plan.subtitle && <p className="text-xs md:text-sm text-gray-600 font-normal">{plan.subtitle?.split(" ").map((word, wordIndex) => (
                  <Fragment key={wordIndex}>
                    {
                      plan.highlight.includes(word) ? <strong className="text-black font-bold"> {word}</strong> : <> {word}</>
                    }
                  </Fragment>
                ))}</p>}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col px-4 md:px-6 pb-4 md:pb-6">
                <Button className={`w-full mb-4 md:mb-6 bg-amber-400 hover:bg-amber-600 text-white font-medium py-2 rounded-md whitespace-nowrap overflow-hidden text-ellipsis ${
                  plan.name === "Plus Account" 
                    ? "px-1 md:px-3 text-xs md:text-sm" 
                    : "px-3 md:px-4 text-sm md:text-base"
                }`}>
                  {plan.buttonText}
                </Button>

                <div className="space-y-2 md:space-y-3 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <React.Fragment key={featureIndex}>
                      {
                        feature == "-" ?
                          (
                            <div className="flex items-center gap-3 justify-center">
                              <span className="text-base md:text-lg font-medium text-amber-500 leading-relaxed ">{feature}</span>
                            </div>
                          )
                          :
                          (
                            <div className="flex items-start gap-2 md:gap-3">
                              <Check className="h-3 w-3 md:h-4 md:w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span className="text-xs md:text-sm text-gray-700 leading-relaxed">{feature}</span>
                            </div>
                          )
                      }
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
