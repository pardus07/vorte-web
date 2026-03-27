"""
Ensure SIP trunk and dispatch rule exist.
Runs at container startup — idempotent (safe to run multiple times).
If trunk/rule already exist, does nothing. If missing, creates them.
"""

import asyncio
import os
import logging

logger = logging.getLogger("sip-setup")


async def ensure_sip_setup():
    """Check and create SIP trunk + dispatch rule if missing."""
    try:
        from livekit.api import LiveKitAPI
        from livekit.protocol.sip import (
            CreateSIPInboundTrunkRequest,
            CreateSIPDispatchRuleRequest,
            ListSIPInboundTrunkRequest,
            ListSIPDispatchRuleRequest,
            SIPInboundTrunkInfo,
            SIPDispatchRuleIndividual,
            SIPDispatchRule,
        )
    except ImportError:
        logger.error("livekit-api not installed, skipping SIP setup")
        return

    api_key = os.environ.get("LIVEKIT_API_KEY", "devkey")
    api_secret = os.environ.get("LIVEKIT_API_SECRET", "secret")
    sip_password = os.environ.get("NETGSM_SIP_PASSWORD", "")

    api = LiveKitAPI(
        url="http://localhost:7880",
        api_key=api_key,
        api_secret=api_secret,
    )

    try:
        # Check existing trunks
        trunks = await api.sip.list_sip_inbound_trunk(ListSIPInboundTrunkRequest())
        existing_trunk_id = None
        for t in trunks.items:
            if t.name == "netgsm-vorte-0850":
                existing_trunk_id = t.sip_trunk_id
                logger.info(f"SIP trunk already exists: {existing_trunk_id}")
                break

        # Create trunk if missing
        if not existing_trunk_id:
            trunk_info = SIPInboundTrunkInfo(
                name="netgsm-vorte-0850",
                numbers=["+908503058635"],
                allowed_addresses=["185.88.7.0/24", "185.88.6.0/24", "185.88.5.0/24"],
                auth_username="8503058635",
                auth_password=sip_password,
            )
            trunk = await api.sip.create_sip_inbound_trunk(
                CreateSIPInboundTrunkRequest(trunk=trunk_info)
            )
            existing_trunk_id = trunk.sip_trunk_id
            logger.info(f"SIP trunk created: {existing_trunk_id}")

        # Check existing dispatch rules
        rules = await api.sip.list_sip_dispatch_rule(ListSIPDispatchRuleRequest())
        has_rule = False
        for r in rules.items:
            if r.name == "vorte-voice-ai-dispatch":
                has_rule = True
                logger.info(f"Dispatch rule already exists: {r.sip_dispatch_rule_id}")
                break

        # Create dispatch rule if missing
        if not has_rule:
            dispatch = await api.sip.create_sip_dispatch_rule(
                CreateSIPDispatchRuleRequest(
                    rule=SIPDispatchRule(
                        dispatch_rule_individual=SIPDispatchRuleIndividual(
                            room_prefix="vorte-call-",
                            pin="",
                        ),
                    ),
                    trunk_ids=[existing_trunk_id],
                    name="vorte-voice-ai-dispatch",
                )
            )
            logger.info(f"Dispatch rule created: {dispatch.sip_dispatch_rule_id}")

        logger.info("SIP setup verified OK")

    except Exception as e:
        logger.error(f"SIP setup error: {e}")
    finally:
        await api.aclose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(ensure_sip_setup())
