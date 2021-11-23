/**
 * Created by jacob.mendt@pikobytes.de on 10.11.21.
 *
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE.txt', which is part of this source code package.
 */
import React, { useState, useRef, useEffect } from "react";
import { useRecoilValue, useSetRecoilState, useRecoilState } from "recoil";
import queryString from "query-string";
import {
  postTransformation,
  queryTransformationTry,
} from "../../../../util/apiGeo";
import { translate } from "../../../../util/util";
import { notificationState } from "../../../../atoms/atoms";
import {
  isLoadingState,
  rectifiedImageParamsState,
  sourceViewParamsState,
  targetViewParamsState,
  transformationState,
} from "../../atoms/atoms";
import ControlButton from "../ControlButton/ControlButton";
import ControlDropDown from "../ControlDropDown/ControlDropDown";
import { usePrevious } from "../../../../util/hooks";
import { Controller } from "./Controller";
import { activateZoomPanAction } from "./actions";
import "./Toolbar.scss";

const ID_CONTROLS = {
  ZOOM_PAN: "control-zoom-pan",
  ADD_GCP: "control-add-gcp",
  MOVE_GCP: "control-move-gcp",
  DEL_GCP: "control-del-gcp",
  DRAW_CLIP: "control-draw-clip",
};

const ID_TRANSFORMATIONS = {
  AFFINE: "affine",
  POLYNOM: "polynom",
  TPS: "tps",
};

function getDropDownOptions() {
  return [
    {
      id: ID_CONTROLS.ADD_GCP,
      title: translate("georef-setgcp"),
      iconClassName: "icon-add-gcp",
    },
    {
      id: ID_CONTROLS.MOVE_GCP,
      title: translate("georef-movegcp"),
      iconClassName: "icon-move-gcp",
    },
    {
      id: ID_CONTROLS.DEL_GCP,
      title: translate("georef-delgcp"),
      iconClassName: "icon-del-gcp",
    },
  ];
}

function getTransformationOptions() {
  return [
    { id: ID_TRANSFORMATIONS.AFFINE, title: "Affine", iconClassName: "" },
    { id: ID_TRANSFORMATIONS.POLYNOM, title: "Polynom", iconClassName: "" },
    { id: ID_TRANSFORMATIONS.TPS, title: "TPS", iconClassName: "" },
  ];
}

export const Toolbar = () => {
  const transformation = useRecoilValue(transformationState);
  const sourceViewParams = useRecoilValue(sourceViewParamsState);
  const targetViewParams = useRecoilValue(targetViewParamsState);
  const setNotification = useSetRecoilState(notificationState);
  const setRectifiedImageParams = useSetRecoilState(rectifiedImageParamsState);
  const [isLoading, setIsLoading] = useRecoilState(isLoadingState);
  const [activeControl, setActiveControl] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const prevActiveControl = usePrevious(activeControl);
  const [selectedAlgorithm, setActiveAlgorithm] = useState(
    ID_TRANSFORMATIONS.AFFINE
  );

  // Ref for the gcp controller
  const refController = useRef(null);

  // Define options
  const dropdownOptions = getDropDownOptions();
  const transformationOptions = getTransformationOptions();

  // Handle click control
  const handleClickControl = (newActiveControl) => {
    setActiveControl(newActiveControl);
  };

  // Handle click Transformation
  const handleSelectAlgorithm = (newTransformation) => {
    setActiveAlgorithm(newTransformation);
  };

  // Handle get rectified image
  const handleClickRectifiedImage = () => {
    const fetchData = async (map_id, params) => {
      const rectifiedImageParams = await queryTransformationTry(map_id, params);
      setIsLoading(false);
      setRectifiedImageParams(rectifiedImageParams);
    };

    if (!isLoading) {
      setIsLoading(true);
      fetchData(
        transformation.map_id,
        Object.assign(refController.current.getParams(), {
          algorithm: selectedAlgorithm,
        })
      );
    }
  };

  // Handle get rectified image
  const handleClickConfirm = () => {
    if (refController.current !== null) {
      const confirmData = async (map_id, params) => {
        await postTransformation(map_id, params);

        // If there is redirect path set use it and if not redirect to main
        const qs = queryString.parse(location.search);
        const path = qs.redirect !== undefined ? qs.redirect : "/";
        window.location.href = `${window.location.origin}${path}`;
      };

      const newParams = {
        clip: refController.current.getClip(),
        params: Object.assign(refController.current.getParams(), {
          algorithm: selectedAlgorithm,
        }),
        overwrites: transformation.overwrites,
      };
      console.log(newParams);
      confirmData(transformation.map_id, newParams);
    }
  };

  // Effect for initializing the gcp controller
  useEffect(() => {
    if (
      transformation !== null &&
      refController.current === null &&
      sourceViewParams !== null &&
      targetViewParams !== null
    ) {
      refController.current = new Controller({
        clip: transformation.clip,
        onSetHelperMsg: (newHelperMsg) => {
          setNotification({
            id: "toolbar-info",
            type: "info",
            text: newHelperMsg,
          });
        },
        params: transformation.params,
        sourceMap: sourceViewParams.map,
        targetMap: targetViewParams.map,
      });

      window.controller = refController.current;

      // Set the zoom pan action as active
      setActiveControl(ID_CONTROLS.ZOOM_PAN);
      setActiveAction(
        activateZoomPanAction(
          sourceViewParams.map,
          targetViewParams.map,
          () => {}
        )
      );
    }
  }, [
    transformation,
    sourceViewParams,
    targetViewParams,
    setActiveControl,
    setActiveAction,
    setNotification,
  ]);

  // Effect for updating the map behavior in case of changing of the active control
  useEffect(() => {
    if (activeAction !== undefined && activeControl !== prevActiveControl) {
      if (activeControl === ID_CONTROLS.ZOOM_PAN) {
        setActiveAction(
          activateZoomPanAction(
            sourceViewParams.map,
            targetViewParams.map,
            activeAction.disable
          )
        );
      } else if (
        refController.current !== null &&
        activeControl === ID_CONTROLS.ADD_GCP
      ) {
        setActiveAction(
          refController.current.activateAddAction(activeAction.disable)
        );
      } else if (
        refController.current !== null &&
        activeControl === ID_CONTROLS.MOVE_GCP
      ) {
        setActiveAction(
          refController.current.activateMoveAction(activeAction.disable)
        );
      } else if (
        refController.current !== null &&
        activeControl === ID_CONTROLS.DEL_GCP
      ) {
        setActiveAction(
          refController.current.activateDelAction(activeAction.disable)
        );
      } else if (
        refController.current !== null &&
        activeControl === ID_CONTROLS.DRAW_CLIP
      ) {
        setActiveAction(
          refController.current.activateDrawClipAction(activeAction.disable)
        );
      } else {
        activeAction.disable();
      }
    }
  }, [activeControl, prevActiveControl, activeAction, setActiveAction]);

  return (
    <div className="vk-georeference-toolbar">
      <div>
        <ControlButton
          activeControl={activeControl}
          id={ID_CONTROLS.ZOOM_PAN}
          iconClassName="icon-zoom-pan"
          onClick={handleClickControl}
          title={translate("georef-movemap")}
        />
        <ControlDropDown
          activeControl={activeControl}
          defaultTitle={translate("georef-editgcp")}
          options={dropdownOptions}
          onClick={handleClickControl}
        />
        <ControlButton
          activeControl={activeControl}
          id={ID_CONTROLS.DRAW_CLIP}
          iconClassName="icon-add-gcp"
          onClick={handleClickControl}
          title={translate("georef-drawclip")}
        />
      </div>

      <div>
        <ControlDropDown
          activeControl={selectedAlgorithm}
          className="control-toggle-transformations"
          disableActiveBehavior={true}
          options={transformationOptions}
          onClick={handleSelectAlgorithm}
          toggleIcon={
            <a
              data-classes="faq"
              className="vk2-modal-anchor"
              title="Frequently Asked Questions (FAQ)"
              href="/faq/#georeferencing-of-maps-algorithm"
              target="_blank"
            >
              <span
                className="glyphicon glyphicon-info-sign"
                aria-hidden="true"
              ></span>
            </a>
          }
        />
        <ControlButton
          id="get-rectified-image"
          className="icon-left"
          iconClassName="glyphicon glyphicon-refresh"
          onClick={handleClickRectifiedImage}
          title={translate("georef-validate")}
        />
        <ControlButton
          id="confirm-rectified-image"
          className="icon-left"
          iconClassName="glyphicon glyphicon-refresh"
          onClick={handleClickConfirm}
          title={translate("georef-confirm")}
        />
      </div>
    </div>
  );
};

export default Toolbar;
