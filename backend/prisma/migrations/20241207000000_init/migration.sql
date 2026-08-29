-- CreateTable
CREATE TABLE "intents" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "source_chain_id" INTEGER NOT NULL,
    "source_tx_hash" TEXT NOT NULL,
    "source_block_number" INTEGER,
    "token_address" TEXT NOT NULL,
    "token_symbol" TEXT,
    "amount_in_token_raw" TEXT NOT NULL,
    "amount_in_usd" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "global_phase" TEXT NOT NULL,
    "allocations" JSONB NOT NULL,
    "chain_statuses" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "fdc_attestation_round" INTEGER,
    "fdc_attestation_status" TEXT,
    "fdc_proof_hash" TEXT,
    "is_fasset" BOOLEAN NOT NULL DEFAULT false,
    "underlying_asset" TEXT,
    "ftso_feed_ids" JSONB,
    "ftso_prices" JSONB,
    "smart_account_used" BOOLEAN NOT NULL DEFAULT false,
    "relayer_tx_hash" TEXT,

    CONSTRAINT "intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fdc_attestations" (
    "id" TEXT NOT NULL,
    "intent_id" TEXT NOT NULL,
    "round_id" INTEGER NOT NULL,
    "request_bytes" TEXT NOT NULL,
    "attestation_type" TEXT NOT NULL,
    "source_chain" TEXT NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "proof" TEXT,
    "response_body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finalized_at" TIMESTAMP(3),

    CONSTRAINT "fdc_attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fasset_mintings" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "fasset_address" TEXT NOT NULL,
    "agent_address" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "underlying_amount" TEXT NOT NULL,
    "fasset_amount" TEXT NOT NULL,
    "underlying_tx_hash" TEXT,
    "minting_tx_hash" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "fasset_mintings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_accounts" (
    "id" TEXT NOT NULL,
    "eoa_address" TEXT NOT NULL,
    "smart_account_address" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "deployment_tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ftso_feed_configs" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "feed_id" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "update_frequency" INTEGER NOT NULL,
    "fallback_source" TEXT,
    "fallback_feed_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ftso_feed_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_dispersals" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "name" TEXT,
    "source_chain_id" INTEGER NOT NULL,
    "token_address" TEXT NOT NULL,
    "token_symbol" TEXT,
    "amount_in_usd" TEXT NOT NULL,
    "allocations" JSONB NOT NULL,
    "schedule_type" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "recurrence_pattern" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "auto_disperse_enabled" BOOLEAN NOT NULL DEFAULT false,
    "monitor_chain_id" INTEGER,
    "balance_threshold" TEXT,
    "check_interval" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_executed_at" TIMESTAMP(3),
    "next_execution_at" TIMESTAMP(3),
    "execution_count" INTEGER NOT NULL DEFAULT 0,
    "last_intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paused_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "scheduled_dispersals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrer_address" TEXT NOT NULL,
    "referral_code" TEXT NOT NULL,
    "referral_link" TEXT NOT NULL,
    "total_referrals" INTEGER NOT NULL DEFAULT 0,
    "total_rewards" TEXT NOT NULL DEFAULT '0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_usage" (
    "id" TEXT NOT NULL,
    "referral_id" TEXT NOT NULL,
    "referred_address" TEXT NOT NULL,
    "reward_amount" TEXT NOT NULL,
    "reward_status" TEXT NOT NULL DEFAULT 'pending',
    "reward_tx_hash" TEXT,
    "intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "rewarded_at" TIMESTAMP(3),

    CONSTRAINT "referral_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "badge_id" TEXT,
    "requirement_type" TEXT NOT NULL,
    "requirement_value" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "progress" JSONB NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "points_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "category" TEXT NOT NULL,
    "achievement_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_date" TIMESTAMP(3),
    "streak_type" TEXT NOT NULL DEFAULT 'dispersal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "milestone_type" TEXT NOT NULL,
    "milestone_value" TEXT NOT NULL,
    "reward_amount" TEXT,
    "reward_status" TEXT NOT NULL DEFAULT 'pending',
    "reward_tx_hash" TEXT,
    "achieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboards" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" TEXT NOT NULL,
    "rank" INTEGER,
    "period" TEXT NOT NULL DEFAULT 'all_time',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_commands" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "command_type" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "intent_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_pools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "creator_address" TEXT NOT NULL,
    "pool_code" TEXT NOT NULL,
    "min_contribution" TEXT NOT NULL,
    "max_members" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "auto_distribute" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "total_contributed" TEXT NOT NULL DEFAULT '0',
    "total_distributed" TEXT NOT NULL DEFAULT '0',
    "current_balance" TEXT NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "gas_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_pool_members" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "contribution" TEXT NOT NULL DEFAULT '0',
    "received" TEXT NOT NULL DEFAULT '0',
    "balance" TEXT NOT NULL DEFAULT '0',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gas_pool_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_pool_contributions" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "intent_id" TEXT,
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gas_pool_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_pool_distributions" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "recipient_address" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "intent_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gas_pool_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gas_pool_activities" (
    "id" TEXT NOT NULL,
    "pool_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "user_address" TEXT,
    "amount" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gas_pool_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidity_deposits" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "token_address" TEXT NOT NULL,
    "token_symbol" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "amount_usd" TEXT NOT NULL,
    "tx_hash" TEXT,
    "total_earned" TEXT NOT NULL DEFAULT '0',
    "total_earned_tokens" TEXT NOT NULL DEFAULT '0',
    "platform_fee_earned" TEXT NOT NULL DEFAULT '0',
    "total_used" TEXT NOT NULL DEFAULT '0',
    "total_used_usd" TEXT NOT NULL DEFAULT '0',
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deposited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidity_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidity_usages" (
    "id" TEXT NOT NULL,
    "deposit_id" TEXT NOT NULL,
    "intent_id" TEXT,
    "recipient_address" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "amount_usd" TEXT NOT NULL,
    "platform_fee" TEXT NOT NULL,
    "provider_fee" TEXT NOT NULL,
    "fee_percentage" TEXT NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidity_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidity_earnings" (
    "id" TEXT NOT NULL,
    "deposit_id" TEXT NOT NULL,
    "usage_id" TEXT,
    "amount" TEXT NOT NULL,
    "amount_tokens" TEXT NOT NULL,
    "fee_type" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidity_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidity_pools" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "token_address" TEXT NOT NULL,
    "token_symbol" TEXT NOT NULL,
    "total_deposited" TEXT NOT NULL DEFAULT '0',
    "total_available" TEXT NOT NULL DEFAULT '0',
    "total_used" TEXT NOT NULL DEFAULT '0',
    "total_earnings" TEXT NOT NULL DEFAULT '0',
    "provider_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "liquidity_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_intents" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "source_chain" INTEGER NOT NULL,
    "source_token" TEXT NOT NULL,
    "source_amount" TEXT NOT NULL,
    "usd_value" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "global_phase" TEXT NOT NULL,
    "distributions" JSONB NOT NULL,
    "exchange_rates_used" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "treasury_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_balances" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "chain_name" TEXT NOT NULL,
    "native_balance" TEXT NOT NULL,
    "native_symbol" TEXT NOT NULL,
    "token_balances" JSONB NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "block_number" INTEGER NOT NULL,

    CONSTRAINT "treasury_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_operations" (
    "id" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "operation_type" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT,
    "amount" TEXT NOT NULL,
    "recipient" TEXT,
    "intent_id" TEXT,
    "status" TEXT NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "gas_used" TEXT,
    "gas_cost" TEXT,

    CONSTRAINT "treasury_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_configs" (
    "id" TEXT NOT NULL,
    "token_rates" JSONB NOT NULL,
    "chain_rates" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rate_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intents_user_address_idx" ON "intents"("user_address");

-- CreateIndex
CREATE INDEX "intents_status_idx" ON "intents"("status");

-- CreateIndex
CREATE INDEX "intents_created_at_idx" ON "intents"("created_at" DESC);

-- CreateIndex
CREATE INDEX "intents_source_chain_id_idx" ON "intents"("source_chain_id");

-- CreateIndex
CREATE INDEX "intents_fdc_attestation_status_idx" ON "intents"("fdc_attestation_status");

-- CreateIndex
CREATE INDEX "intents_is_fasset_idx" ON "intents"("is_fasset");

-- CreateIndex
CREATE INDEX "fdc_attestations_intent_id_idx" ON "fdc_attestations"("intent_id");

-- CreateIndex
CREATE INDEX "fdc_attestations_round_id_idx" ON "fdc_attestations"("round_id");

-- CreateIndex
CREATE INDEX "fdc_attestations_status_idx" ON "fdc_attestations"("status");

-- CreateIndex
CREATE INDEX "fdc_attestations_transaction_hash_idx" ON "fdc_attestations"("transaction_hash");

-- CreateIndex
CREATE INDEX "fasset_mintings_user_address_idx" ON "fasset_mintings"("user_address");

-- CreateIndex
CREATE INDEX "fasset_mintings_status_idx" ON "fasset_mintings"("status");

-- CreateIndex
CREATE INDEX "fasset_mintings_reservation_id_idx" ON "fasset_mintings"("reservation_id");

-- CreateIndex
CREATE INDEX "fasset_mintings_created_at_idx" ON "fasset_mintings"("created_at" DESC);

-- CreateIndex
CREATE INDEX "smart_accounts_eoa_address_idx" ON "smart_accounts"("eoa_address");

-- CreateIndex
CREATE INDEX "smart_accounts_smart_account_address_idx" ON "smart_accounts"("smart_account_address");

-- CreateIndex
CREATE UNIQUE INDEX "smart_accounts_eoa_address_chain_id_key" ON "smart_accounts"("eoa_address", "chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "ftso_feed_configs_symbol_key" ON "ftso_feed_configs"("symbol");

-- CreateIndex
CREATE INDEX "ftso_feed_configs_symbol_idx" ON "ftso_feed_configs"("symbol");

-- CreateIndex
CREATE INDEX "ftso_feed_configs_is_active_idx" ON "ftso_feed_configs"("is_active");

-- CreateIndex
CREATE INDEX "scheduled_dispersals_user_address_idx" ON "scheduled_dispersals"("user_address");

-- CreateIndex
CREATE INDEX "scheduled_dispersals_status_idx" ON "scheduled_dispersals"("status");

-- CreateIndex
CREATE INDEX "scheduled_dispersals_schedule_type_idx" ON "scheduled_dispersals"("schedule_type");

-- CreateIndex
CREATE INDEX "scheduled_dispersals_next_execution_at_idx" ON "scheduled_dispersals"("next_execution_at");

-- CreateIndex
CREATE INDEX "scheduled_dispersals_auto_disperse_enabled_idx" ON "scheduled_dispersals"("auto_disperse_enabled");

-- CreateIndex
CREATE INDEX "scheduled_dispersals_created_at_idx" ON "scheduled_dispersals"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referral_code_key" ON "referrals"("referral_code");

-- CreateIndex
CREATE INDEX "referrals_referrer_address_idx" ON "referrals"("referrer_address");

-- CreateIndex
CREATE INDEX "referrals_referral_code_idx" ON "referrals"("referral_code");

-- CreateIndex
CREATE INDEX "referrals_is_active_idx" ON "referrals"("is_active");

-- CreateIndex
CREATE INDEX "referral_usage_referral_id_idx" ON "referral_usage"("referral_id");

-- CreateIndex
CREATE INDEX "referral_usage_referred_address_idx" ON "referral_usage"("referred_address");

-- CreateIndex
CREATE INDEX "referral_usage_reward_status_idx" ON "referral_usage"("reward_status");

-- CreateIndex
CREATE INDEX "referral_usage_created_at_idx" ON "referral_usage"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_badge_id_key" ON "achievements"("badge_id");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "achievements"("category");

-- CreateIndex
CREATE INDEX "achievements_is_active_idx" ON "achievements"("is_active");

-- CreateIndex
CREATE INDEX "user_achievements_user_address_idx" ON "user_achievements"("user_address");

-- CreateIndex
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements"("achievement_id");

-- CreateIndex
CREATE INDEX "user_achievements_is_completed_idx" ON "user_achievements"("is_completed");

-- CreateIndex
CREATE INDEX "user_achievements_created_at_idx" ON "user_achievements"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_address_achievement_id_key" ON "user_achievements"("user_address", "achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE UNIQUE INDEX "badges_achievement_id_key" ON "badges"("achievement_id");

-- CreateIndex
CREATE INDEX "badges_category_idx" ON "badges"("category");

-- CreateIndex
CREATE INDEX "badges_rarity_idx" ON "badges"("rarity");

-- CreateIndex
CREATE INDEX "badges_is_active_idx" ON "badges"("is_active");

-- CreateIndex
CREATE INDEX "user_badges_user_address_idx" ON "user_badges"("user_address");

-- CreateIndex
CREATE INDEX "user_badges_badge_id_idx" ON "user_badges"("badge_id");

-- CreateIndex
CREATE INDEX "user_badges_earned_at_idx" ON "user_badges"("earned_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_address_badge_id_key" ON "user_badges"("user_address", "badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_streaks_user_address_key" ON "user_streaks"("user_address");

-- CreateIndex
CREATE INDEX "user_streaks_user_address_idx" ON "user_streaks"("user_address");

-- CreateIndex
CREATE INDEX "user_streaks_current_streak_idx" ON "user_streaks"("current_streak");

-- CreateIndex
CREATE INDEX "milestones_user_address_idx" ON "milestones"("user_address");

-- CreateIndex
CREATE INDEX "milestones_milestone_type_idx" ON "milestones"("milestone_type");

-- CreateIndex
CREATE INDEX "milestones_achieved_at_idx" ON "milestones"("achieved_at" DESC);

-- CreateIndex
CREATE INDEX "leaderboards_user_address_idx" ON "leaderboards"("user_address");

-- CreateIndex
CREATE INDEX "leaderboards_category_period_score_idx" ON "leaderboards"("category", "period", "score" DESC);

-- CreateIndex
CREATE INDEX "leaderboards_rank_idx" ON "leaderboards"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboards_user_address_category_period_period_start_key" ON "leaderboards"("user_address", "category", "period", "period_start");

-- CreateIndex
CREATE INDEX "voice_commands_user_address_idx" ON "voice_commands"("user_address");

-- CreateIndex
CREATE INDEX "voice_commands_command_type_idx" ON "voice_commands"("command_type");

-- CreateIndex
CREATE INDEX "voice_commands_created_at_idx" ON "voice_commands"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "gas_pools_pool_code_key" ON "gas_pools"("pool_code");

-- CreateIndex
CREATE INDEX "gas_pools_creator_address_idx" ON "gas_pools"("creator_address");

-- CreateIndex
CREATE INDEX "gas_pools_pool_code_idx" ON "gas_pools"("pool_code");

-- CreateIndex
CREATE INDEX "gas_pools_status_idx" ON "gas_pools"("status");

-- CreateIndex
CREATE INDEX "gas_pools_is_public_idx" ON "gas_pools"("is_public");

-- CreateIndex
CREATE INDEX "gas_pools_created_at_idx" ON "gas_pools"("created_at" DESC);

-- CreateIndex
CREATE INDEX "gas_pool_members_user_address_idx" ON "gas_pool_members"("user_address");

-- CreateIndex
CREATE INDEX "gas_pool_members_pool_id_idx" ON "gas_pool_members"("pool_id");

-- CreateIndex
CREATE UNIQUE INDEX "gas_pool_members_pool_id_user_address_key" ON "gas_pool_members"("pool_id", "user_address");

-- CreateIndex
CREATE INDEX "gas_pool_contributions_pool_id_idx" ON "gas_pool_contributions"("pool_id");

-- CreateIndex
CREATE INDEX "gas_pool_contributions_user_address_idx" ON "gas_pool_contributions"("user_address");

-- CreateIndex
CREATE INDEX "gas_pool_contributions_created_at_idx" ON "gas_pool_contributions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "gas_pool_distributions_pool_id_idx" ON "gas_pool_distributions"("pool_id");

-- CreateIndex
CREATE INDEX "gas_pool_distributions_recipient_address_idx" ON "gas_pool_distributions"("recipient_address");

-- CreateIndex
CREATE INDEX "gas_pool_distributions_created_at_idx" ON "gas_pool_distributions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "gas_pool_activities_pool_id_idx" ON "gas_pool_activities"("pool_id");

-- CreateIndex
CREATE INDEX "gas_pool_activities_user_address_idx" ON "gas_pool_activities"("user_address");

-- CreateIndex
CREATE INDEX "gas_pool_activities_activity_type_idx" ON "gas_pool_activities"("activity_type");

-- CreateIndex
CREATE INDEX "gas_pool_activities_created_at_idx" ON "gas_pool_activities"("created_at" DESC);

-- CreateIndex
CREATE INDEX "liquidity_deposits_user_address_idx" ON "liquidity_deposits"("user_address");

-- CreateIndex
CREATE INDEX "liquidity_deposits_chain_id_idx" ON "liquidity_deposits"("chain_id");

-- CreateIndex
CREATE INDEX "liquidity_deposits_token_address_idx" ON "liquidity_deposits"("token_address");

-- CreateIndex
CREATE INDEX "liquidity_deposits_status_idx" ON "liquidity_deposits"("status");

-- CreateIndex
CREATE INDEX "liquidity_deposits_is_active_idx" ON "liquidity_deposits"("is_active");

-- CreateIndex
CREATE INDEX "liquidity_deposits_deposited_at_idx" ON "liquidity_deposits"("deposited_at" DESC);

-- CreateIndex
CREATE INDEX "liquidity_usages_deposit_id_idx" ON "liquidity_usages"("deposit_id");

-- CreateIndex
CREATE INDEX "liquidity_usages_intent_id_idx" ON "liquidity_usages"("intent_id");

-- CreateIndex
CREATE INDEX "liquidity_usages_recipient_address_idx" ON "liquidity_usages"("recipient_address");

-- CreateIndex
CREATE INDEX "liquidity_usages_used_at_idx" ON "liquidity_usages"("used_at" DESC);

-- CreateIndex
CREATE INDEX "liquidity_earnings_deposit_id_idx" ON "liquidity_earnings"("deposit_id");

-- CreateIndex
CREATE INDEX "liquidity_earnings_earned_at_idx" ON "liquidity_earnings"("earned_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "liquidity_pools_chain_id_key" ON "liquidity_pools"("chain_id");

-- CreateIndex
CREATE INDEX "liquidity_pools_chain_id_token_address_idx" ON "liquidity_pools"("chain_id", "token_address");

-- CreateIndex
CREATE INDEX "treasury_intents_user_address_idx" ON "treasury_intents"("user_address");

-- CreateIndex
CREATE INDEX "treasury_intents_status_idx" ON "treasury_intents"("status");

-- CreateIndex
CREATE INDEX "treasury_intents_created_at_idx" ON "treasury_intents"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "treasury_balances_chain_id_key" ON "treasury_balances"("chain_id");

-- CreateIndex
CREATE INDEX "treasury_balances_chain_id_idx" ON "treasury_balances"("chain_id");

-- CreateIndex
CREATE INDEX "treasury_balances_last_updated_idx" ON "treasury_balances"("last_updated" DESC);

-- CreateIndex
CREATE INDEX "treasury_operations_chain_id_idx" ON "treasury_operations"("chain_id");

-- CreateIndex
CREATE INDEX "treasury_operations_intent_id_idx" ON "treasury_operations"("intent_id");

-- CreateIndex
CREATE INDEX "treasury_operations_tx_hash_idx" ON "treasury_operations"("tx_hash");

-- CreateIndex
CREATE INDEX "treasury_operations_operation_type_idx" ON "treasury_operations"("operation_type");

-- CreateIndex
CREATE INDEX "treasury_operations_timestamp_idx" ON "treasury_operations"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "exchange_rate_configs_is_active_idx" ON "exchange_rate_configs"("is_active");

-- CreateIndex
CREATE INDEX "exchange_rate_configs_version_idx" ON "exchange_rate_configs"("version");

-- CreateIndex
CREATE INDEX "exchange_rate_configs_created_at_idx" ON "exchange_rate_configs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "fdc_attestations" ADD CONSTRAINT "fdc_attestations_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "intents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_usage" ADD CONSTRAINT "referral_usage_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_pool_members" ADD CONSTRAINT "gas_pool_members_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "gas_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_pool_contributions" ADD CONSTRAINT "gas_pool_contributions_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "gas_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_pool_distributions" ADD CONSTRAINT "gas_pool_distributions_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "gas_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gas_pool_activities" ADD CONSTRAINT "gas_pool_activities_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "gas_pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidity_usages" ADD CONSTRAINT "liquidity_usages_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "liquidity_deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidity_earnings" ADD CONSTRAINT "liquidity_earnings_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "liquidity_deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_operations" ADD CONSTRAINT "treasury_operations_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "treasury_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;



