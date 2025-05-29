
import { supabase } from '@/integrations/supabase/client';

export interface TestRecipient {
  name: string;
  relationship: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  birthday?: string;
  anniversary?: string;
  interests: string[];
}

export const testRecipients: TestRecipient[] = [
  {
    name: "Sarah Johnson",
    relationship: "mom",
    email: "sarah.test@example.com",
    phone: "+1-555-0123",
    address: {
      street: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94102",
      country: "US"
    },
    birthday: "1970-05-15",
    interests: ["cooking", "gardening", "reading"]
  },
  {
    name: "Mike Davis",
    relationship: "partner",
    email: "mike.test@example.com",
    phone: "+1-555-0456",
    address: {
      street: "456 Oak Avenue",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90210",
      country: "US"
    },
    anniversary: "2020-06-20",
    interests: ["sports", "technology", "travel"]
  },
  {
    name: "Emma Wilson",
    relationship: "friend",
    email: "emma.test@example.com",
    phone: "+1-555-0789",
    address: {
      street: "789 Pine Street",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
      country: "US"
    },
    birthday: "1995-12-03",
    interests: ["art", "music", "coffee"]
  }
];

export const createTestData = async (userId: string) => {
  console.log('Creating test data for user:', userId);
  
  try {
    // First, ensure user has a profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: 'dev@example.com',
        full_name: 'Dev User',
        avatar_url: null,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Create test recipients
    const recipients = testRecipients.map(recipient => ({
      user_id: userId,
      name: recipient.name,
      relationship: recipient.relationship,
      email: recipient.email,
      phone: recipient.phone,
      address: recipient.address,
      birthday: recipient.birthday || null,
      anniversary: recipient.anniversary || null,
      interests: recipient.interests,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: insertedRecipients, error: recipientsError } = await supabase
      .from('recipients')
      .upsert(recipients, { onConflict: 'user_id,email' })
      .select();

    if (recipientsError) {
      console.error('Error creating recipients:', recipientsError);
      throw recipientsError;
    }

    console.log('Created recipients:', insertedRecipients);

    // Create some test scheduled gifts
    if (insertedRecipients && insertedRecipients.length > 0) {
      const testGifts = [
        {
          user_id: userId,
          recipient_id: insertedRecipients[0].id,
          occasion: 'Birthday',
          occasion_date: '2024-05-15',
          delivery_date: '2024-05-12',
          price_range: '$25-50',
          gift_type: 'Candle',
          gift_description: 'Vanilla scented candle for mom',
          status: 'scheduled',
          payment_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: userId,
          recipient_id: insertedRecipients[1].id,
          occasion: 'Anniversary',
          occasion_date: '2024-06-20',
          delivery_date: '2024-06-17',
          price_range: '$25-50',
          gift_type: 'Candle',
          gift_description: 'Anniversary gift candle',
          status: 'paid',
          payment_status: 'paid',
          payment_amount: 2500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const { error: giftsError } = await supabase
        .from('scheduled_gifts')
        .upsert(testGifts);

      if (giftsError) {
        console.error('Error creating test gifts:', giftsError);
      }
    }

    return { success: true, recipients: insertedRecipients };
  } catch (error) {
    console.error('Error in createTestData:', error);
    throw error;
  }
};

export const clearTestData = async (userId: string) => {
  console.log('Clearing test data for user:', userId);
  
  try {
    // Delete in correct order due to foreign key constraints
    await supabase.from('scheduled_gifts').delete().eq('user_id', userId);
    await supabase.from('recipients').delete().eq('user_id', userId);
    
    console.log('Test data cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('Error clearing test data:', error);
    throw error;
  }
};
